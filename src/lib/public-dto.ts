import type {
  Category,
  Customer,
  Payment,
  Product,
  ProductImage,
  RepairCloseReason,
  RepairEvent,
  RepairEventKind,
  RepairPhoto,
  RepairPhotoStage,
  RepairQuote,
  RepairQuoteItem,
  RepairStatus,
  RepairTicket,
} from "./db/schema";
import { productImageSrc, productOgImageSrc } from "./product-images";
import type { ProductSpecs } from "./product-specs";
import { ticketBalance, ticketChargeFils, type TicketBalance } from "./repairs/balance";

// The only shapes public pages receive. Each is built field by field from an allowlist,
// so a column added later (cost, serials, hold notes, internal flags) stays private
// until it is deliberately added here.

/** Statuses the public can see. Drafts and archived products are never sent. */
export type PublicStatus = "available" | "reserved" | "sold";

export type PublicCategory = {
  slug: string;
  nameEn: string;
  nameAr: string;
};

export type PublicImage = {
  /** For next/image: the stored path without width or extension. */
  src: string;
  /** A 1200×630 JPEG for link previews (WhatsApp shows no WebP previews). */
  ogSrc: string;
  width: number;
  height: number;
  altEn: string | null;
  altAr: string | null;
};

/** Spec fields shown on product pages. `serial` stays admin-only. */
const publicSpecKeys = [
  "bodyStyle",
  "body",
  "finish",
  "neck",
  "fretboard",
  "frets",
  "scale",
  "pickupLayout",
  "pickups",
  "weightKg",
  "case",
  "mods",
] as const satisfies readonly (keyof ProductSpecs)[];

export type PublicSpecs = Pick<ProductSpecs, (typeof publicSpecKeys)[number]>;

export type PublicProduct = {
  slug: string;
  sku: string;
  kind: Product["kind"];
  category: PublicCategory;
  brand: string | null;
  model: string | null;
  year: number | null;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  techNotesEn: string | null;
  techNotesAr: string | null;
  /** Null for new, ungraded gear. */
  condition: Product["condition"];
  priceFils: number;
  compareAtFils: number | null;
  status: PublicStatus;
  specs: PublicSpecs;
  /** In display order; the first is the main photo. */
  images: PublicImage[];
  publishedAt: Date;
  soldAt: Date | null;
  updatedAt: Date;
};

const publicStatuses: readonly string[] = [
  "available",
  "reserved",
  "sold",
] satisfies PublicStatus[];

export function isPublicStatus(status: string): status is PublicStatus {
  return publicStatuses.includes(status);
}

export function toPublicCategory(category: Category): PublicCategory {
  return { slug: category.slug, nameEn: category.nameEn, nameAr: category.nameAr };
}

export function toPublicImage(image: ProductImage): PublicImage {
  return {
    src: productImageSrc(image.key),
    ogSrc: productOgImageSrc(image.key),
    width: image.width,
    height: image.height,
    altEn: image.altEn,
    altAr: image.altAr,
  };
}

function toPublicSpecs(specs: ProductSpecs): PublicSpecs {
  const result: Record<string, unknown> = {};
  for (const key of publicSpecKeys) {
    if (specs[key] !== undefined) result[key] = specs[key];
  }
  return result as PublicSpecs;
}

/**
 * The public view of a product, or null when it isn't listed (a draft, archived, or
 * missing what a listing needs). `images` must be the product's own, in display order.
 */
export function toPublicProduct(
  product: Product,
  category: Category | null,
  images: readonly ProductImage[],
): PublicProduct | null {
  const { status, priceFils, publishedAt } = product;
  if (!isPublicStatus(status) || priceFils === null || !publishedAt || !category) return null;

  return {
    slug: product.slug,
    sku: product.sku,
    kind: product.kind,
    category: toPublicCategory(category),
    brand: product.brand,
    model: product.model,
    year: product.year,
    titleEn: product.titleEn,
    titleAr: product.titleAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    techNotesEn: product.techNotesEn,
    techNotesAr: product.techNotesAr,
    condition: product.condition,
    priceFils,
    compareAtFils: product.compareAtFils,
    status,
    specs: toPublicSpecs(product.specs),
    images: images.map(toPublicImage),
    publishedAt,
    soldAt: product.soldAt,
    updatedAt: product.updatedAt,
  };
}

/** A repair photo the customer may see, through short-lived signed links. */
export type PublicRepairPhoto = {
  stage: RepairPhotoStage;
  width: number;
  height: number;
  /** Signed links to the 640 and 1280 px files. */
  src: string;
  srcLarge: string;
};

export type PublicRepairEvent = {
  kind: RepairEventKind;
  toStatus: RepairStatus | null;
  closeReason: RepairCloseReason | null;
  note: string | null;
  /** "YYYY-MM-DD", a day in Dubai. */
  etaDate: string | null;
  quoteVersion: number | null;
  at: Date;
};

export type PublicRepairQuote = {
  id: number;
  version: number;
  status: "pending" | "approved" | "declined";
  items: { label: string; amountFils: number }[];
  totalFils: number;
  notes: string | null;
  decidedAt: Date | null;
};

/**
 * The tracking page's view of a ticket, shown only after the phone check. No customer
 * details, serial, intake notes, internal notes, hidden photos or older quote versions.
 */
export type PublicTicket = {
  number: string;
  instrument: string | null;
  issue: string;
  status: RepairStatus;
  closeReason: RepairCloseReason | null;
  etaDate: string | null;
  /** Whether the repair terms are accepted; if not, approving a quote accepts them. */
  termsAccepted: boolean;
  quote: PublicRepairQuote | null;
  /**
   * What the repair costs (the approved total, or the diagnosis fee after a decline), what's
   * been paid and the balance. Shown once it's Ready, or once anything has been paid; never
   * on a cancelled ticket.
   */
  payment: TicketBalance | null;
  /** Oldest first. */
  events: PublicRepairEvent[];
  photos: PublicRepairPhoto[];
};

type TicketSource = {
  ticket: RepairTicket;
  customer: Customer;
  quotes: (RepairQuote & { items: RepairQuoteItem[] })[];
  events: RepairEvent[];
  photos: RepairPhoto[];
  payments: Pick<Payment, "kind" | "amountFils">[];
};

/** Builds the tracking page's ticket; `photoUrl` signs a link to one stored file. */
export function toPublicTicket(
  { ticket, quotes, events, photos, payments }: TicketSource,
  photoUrl: (file: string) => string,
): PublicTicket {
  const live = quotes.find((quote) => quote.status !== "superseded");
  const quote: PublicRepairQuote | null =
    live && live.status !== "superseded"
      ? {
          id: live.id,
          version: live.version,
          status: live.status,
          items: live.items.map((item) => ({ label: item.label, amountFils: item.amountFils })),
          totalFils: live.totalFils,
          notes: live.notes,
          decidedAt: live.decidedAt,
        }
      : null;

  const balance = ticketBalance(ticketChargeFils(ticket, quote), payments);
  const payment =
    ticket.closeReason !== "cancelled" &&
    ((ticket.status === "ready" && balance.chargeFils !== null) || balance.paidFils > 0)
      ? balance
      : null;

  const versionOf = (quoteId: number | null) =>
    quotes.find((q) => q.id === quoteId)?.version ?? null;

  return {
    number: ticket.number,
    instrument: [ticket.instrumentBrand, ticket.instrumentModel].filter(Boolean).join(" ") || null,
    issue: ticket.issue,
    status: ticket.status,
    closeReason: ticket.closeReason,
    etaDate: ticket.etaDate,
    termsAccepted: ticket.termsAcceptedAt !== null,
    quote,
    payment,
    events: events
      // A note only for the admin isn't the customer's news.
      .filter((event) => event.kind !== "update" || event.publicNote || event.etaDate)
      .map((event) => ({
        kind: event.kind,
        toStatus: event.toStatus,
        closeReason: event.closeReason,
        note: event.publicNote,
        etaDate: event.etaDate,
        quoteVersion: event.kind === "quote" ? versionOf(event.quoteId) : null,
        at: event.createdAt,
      })),
    photos: photos
      .filter((photo) => photo.customerVisible)
      .map((photo) => ({
        stage: photo.stage,
        width: photo.width,
        height: photo.height,
        src: photoUrl(`${photo.key}-640.webp`),
        srcLarge: photoUrl(`${photo.key}-1280.webp`),
      })),
  };
}
