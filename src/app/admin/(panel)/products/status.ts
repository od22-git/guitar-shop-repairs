import type { ProductStatus } from "@/lib/db/schema";

export const statusLabels: Record<ProductStatus, string> = {
  draft: "Draft",
  available: "Available",
  reserved: "On hold",
  sold: "Sold",
  archived: "Archived",
};
