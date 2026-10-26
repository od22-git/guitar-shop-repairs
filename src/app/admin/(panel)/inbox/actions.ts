"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { setSubmissionStatus } from "@/lib/inbox";

import type { ActionState } from "../../_components/action-state";

// Every action starts with requireAdmin(): server actions are public endpoints (see
// e2e/admin-access.spec.ts). Converting a booking happens on the new-ticket form.

const labels = { new: "Moved back to new.", replied: "Marked replied.", archived: "Archived." };

export async function setInboxStatusAction(
  id: number,
  status: keyof typeof labels,
): Promise<ActionState> {
  await requireAdmin();
  const itemId = Number(id);
  if (!Number.isSafeInteger(itemId) || itemId < 1 || !(status in labels)) {
    throw new Error("Invalid input");
  }
  if (!(await setSubmissionStatus(db, itemId, status))) {
    return { ok: false, message: "This item has a ticket now, or no longer exists." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: labels[status], at: Date.now() };
}
