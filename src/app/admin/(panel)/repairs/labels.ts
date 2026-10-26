import type {
  RepairCloseReason,
  RepairDecisionMethod,
  RepairIntakeMethod,
  RepairPhotoStage,
  RepairQuoteStatus,
  RepairStatus,
} from "@/lib/db/schema";
import type { MoveProblem } from "@/lib/repairs/state-machine";

export const statusLabels: Record<RepairStatus, string> = {
  received: "Received",
  diagnosed: "Diagnosed",
  in_repair: "In repair",
  ready: "Ready",
  closed: "Closed",
};

/** The button that moves a ticket to each status. */
export const moveLabels: Record<RepairStatus, string> = {
  received: "Received",
  diagnosed: "Mark diagnosed",
  in_repair: "Start repair",
  ready: "Mark ready",
  closed: "Close ticket",
};

export const closeReasonLabels: Record<RepairCloseReason, string> = {
  collected: "Collected",
  delivered: "Delivered",
  abandoned: "Abandoned (repair terms)",
  cancelled: "Cancelled",
};

export const quoteStatusLabels: Record<RepairQuoteStatus, string> = {
  pending: "Waiting for the customer",
  approved: "Approved",
  declined: "Declined",
  superseded: "Replaced by a newer version",
};

export const decisionMethodLabels: Record<RepairDecisionMethod, string> = {
  link: "on the tracking link",
  whatsapp: "on WhatsApp",
  in_person: "in person",
};

export const intakeMethodLabels: Record<RepairIntakeMethod, string> = {
  drop_off: "Drop-off",
  courier: "Courier",
};

export const photoStageLabels: Record<RepairPhotoStage, string> = {
  intake: "At intake",
  progress: "During the work",
  done: "Finished",
};

/** Why a status button is unavailable. */
export const blockedLabels: Record<MoveProblem, string> = {
  closed: "The ticket is closed.",
  not_allowed: "Not from this status.",
  needs_quote: "Needs a quote.",
  needs_approval: "Needs the quote approved.",
  needs_decline: "Only after a declined quote.",
  quote_pending: "A quote is waiting for approval.",
  needs_reason: "Choose a reason.",
  bad_reason: "Not for this status.",
};
