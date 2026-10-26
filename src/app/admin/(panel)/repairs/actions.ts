"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  repairCloseReason,
  repairStatus,
  type RepairCloseReason,
  type RepairStatus,
} from "@/lib/db/schema";
import { RepairError, type RepairProblem } from "@/lib/repairs/errors";
import {
  optionalAmount,
  parseQuoteForm,
  parseTicketDetailsForm,
  parseTicketForm,
  parseUpdateForm,
} from "@/lib/repairs/forms";
import { deleteRepairPhoto, setRepairPhotoVisible } from "@/lib/repairs/photos";
import { createQuote, decideQuote } from "@/lib/repairs/quotes";
import {
  createTicket,
  markNotified,
  moveTicket,
  postUpdate,
  rotatePublicToken,
  undoLastStatus,
  updateTicketDetails,
} from "@/lib/repairs/tickets";
import { storage } from "@/lib/storage";

import type { ActionState } from "../../_components/action-state";

import { statusLabels } from "./labels";

// Every action starts with requireAdmin(): server actions are public endpoints (see
// e2e/admin-access.spec.ts). Repair pages are dynamic, so a change refreshes the ticket
// page and the admin layout, whose nav shows the unsent-message count.

const messages: Record<RepairProblem, string> = {
  closed: "This ticket is closed. Undo the last status to reopen it.",
  not_allowed: "That change isn't possible from here. Reload the page to see the latest status.",
  needs_quote: "Write a quote first.",
  needs_approval: "The quote needs the customer's approval first.",
  needs_decline: "Only a declined quote goes straight to Ready.",
  quote_pending: "A quote is waiting for the customer's approval.",
  needs_reason: "Choose why it's being closed.",
  bad_reason: "That reason doesn't fit this status.",
  not_found: "This ticket no longer exists.",
  nothing_to_undo: "There's no status change to undo.",
  cannot_quote: "Quotes can't change once the instrument is ready.",
  stale_quote: "This quote has changed or was already decided. Reload the page.",
  empty_update: "Write a note or set a new ETA.",
};

function failure(error: unknown): ActionState {
  if (error instanceof RepairError) return { ok: false, message: messages[error.problem] };
  throw error;
}

function done(message: string): ActionState {
  revalidatePath("/admin", "layout");
  return { ok: true, message, at: Date.now() };
}

/** Ids come from bound arguments, which a caller can change: check them. */
function toId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid id");
  return id;
}

const isStatus = (value: unknown): value is RepairStatus =>
  typeof value === "string" && (repairStatus.enumValues as readonly string[]).includes(value);
const isCloseReason = (value: unknown): value is RepairCloseReason =>
  typeof value === "string" && (repairCloseReason.enumValues as readonly string[]).includes(value);

const invalid: ActionState = { ok: false, message: "Check the highlighted fields." };

export async function createTicketAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseTicketForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  const { id } = await createTicket(db, parsed.data);
  revalidatePath("/admin", "layout");
  redirect(`/admin/repairs/${id}?created=1`);
}

export async function updateTicketAction(
  ticketId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseTicketDetailsForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await updateTicketDetails(db, toId(ticketId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done("Saved.");
}

export async function moveTicketAction(
  ticketId: number,
  expected: string,
  to: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  if (!isStatus(expected) || !isStatus(to)) throw new Error("Invalid status");
  const reason = form.get("closeReason");
  const note =
    String(form.get("note") ?? "")
      .trim()
      .slice(0, 1000) || undefined;
  try {
    await moveTicket(db, toId(ticketId), {
      expected,
      to,
      closeReason: isCloseReason(reason) ? reason : undefined,
      note,
    });
  } catch (error) {
    return failure(error);
  }
  return done(`Now ${statusLabels[to].toLowerCase()}. Send the customer the update.`);
}

export async function undoStatusAction(ticketId: number): Promise<ActionState> {
  await requireAdmin();
  let status: RepairStatus;
  try {
    status = await undoLastStatus(db, toId(ticketId));
  } catch (error) {
    return failure(error);
  }
  return done(`Undone: back to ${statusLabels[status].toLowerCase()}.`);
}

export async function postUpdateAction(
  ticketId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseUpdateForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  try {
    await postUpdate(db, toId(ticketId), parsed.data);
  } catch (error) {
    return failure(error);
  }
  return done("Update posted.");
}

export async function createQuoteAction(
  ticketId: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseQuoteForm(form);
  if (!parsed.ok) return { ...invalid, errors: parsed.errors };
  let version: number;
  try {
    ({ version } = await createQuote(db, toId(ticketId), parsed.data));
  } catch (error) {
    return failure(error);
  }
  return done(
    parsed.data.approvedInPerson
      ? `Quote v${version} saved as approved.`
      : `Quote v${version} saved.`,
  );
}

export async function decideQuoteAction(
  quoteId: number,
  version: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const decision = form.get("decision");
  const method = form.get("method");
  if (decision !== "approved" && decision !== "declined") throw new Error("Invalid decision");
  if (method !== "in_person" && method !== "whatsapp") {
    return { ok: false, message: "Choose how the customer told you." };
  }
  const fee = optionalAmount.safeParse(form.get("diagnosisFee") ?? undefined);
  if (!fee.success) {
    return { ...invalid, errors: { diagnosisFee: fee.error.issues[0].message } };
  }
  try {
    await decideQuote(db, toId(quoteId), {
      version: toId(version),
      decision,
      method,
      diagnosisFeeFils: decision === "declined" ? fee.data : undefined,
    });
  } catch (error) {
    return failure(error);
  }
  return done(decision === "approved" ? "Approval recorded." : "Decline recorded.");
}

export async function markNotifiedAction(eventId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await markNotified(db, toId(eventId));
  } catch (error) {
    return failure(error);
  }
  return done("Marked as sent.");
}

export async function rotateLinkAction(ticketId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await rotatePublicToken(db, toId(ticketId));
  } catch (error) {
    return failure(error);
  }
  return done("New link made. The old one no longer works.");
}

export async function setPhotoVisibleAction(
  photoId: number,
  visible: boolean,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await setRepairPhotoVisible(db, toId(photoId), visible === true);
  } catch (error) {
    return failure(error);
  }
  return done(visible ? "The customer can see this photo." : "Hidden from the customer.");
}

export async function deletePhotoAction(photoId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    await deleteRepairPhoto(db, storage, toId(photoId));
  } catch (error) {
    return failure(error);
  }
  return done("Photo deleted.");
}
