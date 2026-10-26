import type { Emirate, InboxKind, InboxStatus, RepairIntakeMethod } from "@/lib/db/schema";

export const kindLabels: Record<InboxKind, string> = {
  repair_request: "Repair booking",
  sell: "Guitar offered",
  contact: "Message",
};

export const inboxStatusLabels: Record<InboxStatus, string> = {
  new: "New",
  replied: "Replied",
  converted: "Ticket opened",
  archived: "Archived",
};

export const intakeLabels: Record<RepairIntakeMethod, string> = {
  drop_off: "Will drop it off",
  courier: "Wants a courier pickup",
};

export const emirateLabels: Record<Emirate, string> = {
  abu_dhabi: "Abu Dhabi",
  dubai: "Dubai",
  sharjah: "Sharjah",
  ajman: "Ajman",
  umm_al_quwain: "Umm Al Quwain",
  ras_al_khaimah: "Ras Al Khaimah",
  fujairah: "Fujairah",
};
