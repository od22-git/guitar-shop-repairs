import type { DeliveryMethod, OrderStatus, PaymentKind, PaymentMethod } from "@/lib/db/schema";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "To hand over",
  fulfilled: "Handed over",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  courier: "Courier delivery",
  appointment: "Collection by appointment",
};

export const paymentKindLabels: Record<PaymentKind, string> = {
  deposit: "Deposit",
  payment: "Payment",
  refund: "Refund",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  cod: "Cash on delivery (courier)",
  bank_transfer: "Bank transfer",
  card_online: "Card (online)",
};

export const emirateLabels = {
  abu_dhabi: "Abu Dhabi",
  dubai: "Dubai",
  sharjah: "Sharjah",
  ajman: "Ajman",
  umm_al_quwain: "Umm Al Quwain",
  ras_al_khaimah: "Ras Al Khaimah",
  fujairah: "Fujairah",
} as const;
