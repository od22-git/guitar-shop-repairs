import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { ProductSpecs } from "../product-specs";

// Tables for the catalog and shop settings (M2), admin sign-in (M4), repairs (M5) and the
// customer side of repairs (M6: tracking-link checks, the inbox, rate limits), and orders
// and payments (M7). Money columns are integer fils (1 AED = 100 fils); times are
// timestamptz, stored in UTC and shown in Asia/Dubai.

export const productKind = pgEnum("product_kind", ["guitar", "gear"]);

export const productCondition = pgEnum("product_condition", [
  "mint",
  "excellent",
  "very_good",
  "good",
  "fair",
]);

/**
 * draft: being prepared, never public. available: listed and for sale. reserved: on
 * hold for a customer (one-off items only). sold: none left. archived: hidden, kept
 * for history. Drafts and archived products 404 on the public site.
 */
export const productStatus = pgEnum("product_status", [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
]);

export const emirate = pgEnum("emirate", [
  "abu_dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "umm_al_quwain",
  "ras_al_khaimah",
  "fujairah",
]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Shared by both locales: /en/shop/<slug> and /ar/shop/<slug>.
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    kind: productKind("kind").notNull(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    // Locked once published (M4) so shared links never break.
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    brand: text("brand"),
    model: text("model"),
    year: smallint("year"),
    titleEn: text("title_en").notNull(),
    // Arabic fields are optional: the public site falls back to English.
    titleAr: text("title_ar"),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    techNotesEn: text("tech_notes_en"),
    techNotesAr: text("tech_notes_ar"),
    // Null for new, ungraded gear such as strings.
    condition: productCondition("condition"),
    priceFils: integer("price_fils"),
    // The earlier price, shown struck through after a price drop.
    compareAtFils: integer("compare_at_fils"),
    // Admin only, never sent to public pages (profit tracking, VAT margin scheme).
    costFils: integer("cost_fils"),
    quantity: integer("quantity").notNull().default(1),
    status: productStatus("status").notNull().default("draft"),
    reservedNote: text("reserved_note"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    specs: jsonb("specs").$type<ProductSpecs>().notNull().default({}),
    // Development stock with free-licence photos; the launch check (M9) fails while any remain.
    isSample: boolean("is_sample").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    check("products_quantity_non_negative", sql`${t.quantity} >= 0`),
    // A guitar is a single instrument.
    check("products_guitar_single", sql`${t.kind} <> 'guitar' OR ${t.quantity} <= 1`),
    check(
      "products_money_non_negative",
      sql`coalesce(${t.priceFils}, 0) >= 0 AND coalesce(${t.costFils}, 0) >= 0`,
    ),
    check(
      "products_compare_at_above_price",
      sql`${t.compareAtFils} IS NULL OR ${t.compareAtFils} > ${t.priceFils}`,
    ),
    // Anything the public can see has a price, a category and a publish date.
    check(
      "products_listed_complete",
      sql`${t.status} IN ('draft', 'archived') OR (${t.priceFils} IS NOT NULL AND ${t.categoryId} IS NOT NULL AND ${t.publishedAt} IS NOT NULL)`,
    ),
    // Stock and status agree: listed items have stock, sold ones have none.
    check(
      "products_stock_matches_status",
      sql`(${t.status} NOT IN ('available', 'reserved') OR ${t.quantity} > 0) AND (${t.status} <> 'sold' OR ${t.quantity} = 0)`,
    ),
    // A hold is on one specific item, so only single-unit listings can be reserved.
    check("products_reserved_single", sql`${t.status} <> 'reserved' OR ${t.quantity} = 1`),
    check("products_year_plausible", sql`${t.year} IS NULL OR ${t.year} BETWEEN 1900 AND 2100`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Storage key without width or extension; each image is stored at several widths.
    // Keys under "samples/" are the sample photos in public/images/samples.
    key: text("key").notNull().unique(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    altEn: text("alt_en"),
    altAr: text("alt_ar"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId, t.sort),
    check("product_images_size_positive", sql`${t.width} > 0 AND ${t.height} > 0`),
  ],
);

/** Admin-editable shop settings, one JSON value per key. See src/lib/settings/schema.ts. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    emirates: emirate("emirates").array().notNull(),
    feeFils: integer("fee_fils").notNull(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    check("delivery_zones_fee_non_negative", sql`${t.feeFils} >= 0`),
    check("delivery_zones_has_emirates", sql`cardinality(${t.emirates}) > 0`),
  ],
);

// Customers and repairs (M5). Customers are contact records, not accounts: there is no
// customer sign-in. A ticket's number (R-0001) is for conversations only; its tracking
// page is reached by `public_token` (M6), which can be rotated.

export const locale = pgEnum("locale", ["en", "ar"]);

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  // E.164, from normalizePhone(): a returning customer is matched on it.
  phoneE164: text("phone_e164").notNull().unique(),
  // The language WhatsApp messages and the tracking page use.
  preferredLocale: locale("preferred_locale").notNull().default("en"),
  whatsappConsentAt: timestamp("whatsapp_consent_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** See src/lib/repairs/state-machine.ts for the transitions between them. */
export const repairStatus = pgEnum("repair_status", [
  "received",
  "diagnosed",
  "in_repair",
  "ready",
  "closed",
]);

export const repairCloseReason = pgEnum("repair_close_reason", [
  "collected",
  "delivered",
  "abandoned",
  "cancelled",
]);

export const repairIntakeMethod = pgEnum("repair_intake_method", ["drop_off", "courier"]);

/** Ticket numbers, R-0001 onwards; see formatTicketNumber(). */
export const repairTicketNumbers = pgSequence("repair_ticket_number_seq", { startWith: 1 });

export const repairTickets = pgTable(
  "repair_tickets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    number: text("number").notNull().unique(),
    // 128 random bits, base64url. Never derived from the number; rotating it kills the
    // old link.
    publicToken: text("public_token").notNull().unique(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    instrumentBrand: text("instrument_brand"),
    instrumentModel: text("instrument_model"),
    serial: text("serial"),
    colour: text("colour"),
    issue: text("issue").notNull(),
    intakeNotes: text("intake_notes"),
    accessories: text("accessories"),
    intakeMethod: repairIntakeMethod("intake_method").notNull(),
    // When the customer accepted the repair terms (at drop-off, or on approval in M6).
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    // The calendar day in Dubai the instrument should be ready.
    etaDate: date("eta_date"),
    status: repairStatus("status").notNull().default("received"),
    closeReason: repairCloseReason("close_reason"),
    // Charged when the customer declines the quote (see the repair terms).
    diagnosisFeeFils: integer("diagnosis_fee_fils"),
    // Wrong phone digits typed on the tracking page since the last lock or success; five
    // lock the page for 15 minutes (src/lib/repairs/access.ts). Per ticket, not per IP,
    // because UAE mobile networks share IP addresses.
    accessFailures: integer("access_failures").notNull().default(0),
    accessLockedUntil: timestamp("access_locked_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("repair_tickets_status_idx").on(t.status),
    index("repair_tickets_customer_idx").on(t.customerId),
    check(
      "repair_tickets_close_reason",
      sql`(${t.status} = 'closed') = (${t.closeReason} IS NOT NULL)`,
    ),
    check("repair_tickets_fee_non_negative", sql`coalesce(${t.diagnosisFeeFils}, 0) >= 0`),
  ],
);

export const repairQuoteStatus = pgEnum("repair_quote_status", [
  "pending",
  "approved",
  "declined",
  "superseded",
]);

export const repairDecisionMethod = pgEnum("repair_decision_method", [
  "link",
  "whatsapp",
  "in_person",
]);

export const repairQuotes = pgTable(
  "repair_quotes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    // 1, 2, …: a new version supersedes the one before and needs approving again.
    version: integer("version").notNull(),
    status: repairQuoteStatus("status").notNull().default("pending"),
    totalFils: integer("total_fils").notNull(),
    // Shown to the customer with the quote.
    notes: text("notes"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionMethod: repairDecisionMethod("decision_method"),
    // A hash of the IP that approved through the link (M6), never the IP itself.
    decisionIpHash: text("decision_ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("repair_quotes_version_unique").on(t.ticketId, t.version),
    // Only the latest version is live; older ones are superseded.
    uniqueIndex("repair_quotes_one_current")
      .on(t.ticketId)
      .where(sql`${t.status} <> 'superseded'`),
    check("repair_quotes_total_non_negative", sql`${t.totalFils} >= 0`),
    check(
      "repair_quotes_decision",
      // Pending quotes are undecided; approved and declined ones say when and how. A
      // superseded version keeps whatever it had.
      sql`(${t.decidedAt} IS NULL) = (${t.decisionMethod} IS NULL) AND (${t.status} <> 'pending' OR ${t.decidedAt} IS NULL) AND (${t.status} NOT IN ('approved', 'declined') OR ${t.decidedAt} IS NOT NULL)`,
    ),
  ],
);

export const repairQuoteItems = pgTable(
  "repair_quote_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    quoteId: integer("quote_id")
      .notNull()
      .references(() => repairQuotes.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountFils: integer("amount_fils").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    index("repair_quote_items_quote_idx").on(t.quoteId, t.sort),
    check("repair_quote_items_amount_non_negative", sql`${t.amountFils} >= 0`),
  ],
);

/**
 * status: a status change. update: a note with no change (Post update). correction: an
 * Undo, back to the earlier status; history is never deleted. quote: a new quote version
 * sent while work was under way. Each one is a WhatsApp message until `notified_at`.
 */
export const repairEventKind = pgEnum("repair_event_kind", [
  "status",
  "update",
  "correction",
  "quote",
]);

export const repairEvents = pgTable(
  "repair_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    kind: repairEventKind("kind").notNull(),
    // Null on the first event, when the ticket is opened.
    fromStatus: repairStatus("from_status"),
    toStatus: repairStatus("to_status"),
    // Why it was closed, on the change to closed.
    closeReason: repairCloseReason("close_reason"),
    // The quote the message is about: a new version, or the live one at a status change.
    quoteId: integer("quote_id").references(() => repairQuotes.id, { onDelete: "set null" }),
    // A new ETA given with this event.
    etaDate: date("eta_date"),
    publicNote: text("public_note"),
    // Admin only, never on the tracking page.
    internalNote: text("internal_note"),
    createdAt: createdAt(),
    // When the WhatsApp message was sent (or marked as not needed).
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (t) => [
    index("repair_events_ticket_idx").on(t.ticketId, t.id),
    index("repair_events_unsent_idx")
      .on(t.ticketId)
      .where(sql`${t.notifiedAt} IS NULL`),
    check(
      "repair_events_status_change",
      sql`${t.kind} NOT IN ('status', 'correction') OR ${t.toStatus} IS NOT NULL`,
    ),
  ],
);

export const repairPhotoStage = pgEnum("repair_photo_stage", ["intake", "progress", "done"]);

/** In the private bucket; shown to the customer (M6) only if `customer_visible`. */
export const repairPhotos = pgTable(
  "repair_photos",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => repairTickets.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    stage: repairPhotoStage("stage").notNull(),
    customerVisible: boolean("customer_visible").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("repair_photos_ticket_idx").on(t.ticketId, t.id),
    check("repair_photos_size_positive", sql`${t.width} > 0 AND ${t.height} > 0`),
  ],
);

/**
 * What the public forms send: a repair booking (M6), a guitar offered on /sell (M7), or a
 * general message. They wait in the admin inbox.
 */
export const inboxKind = pgEnum("inbox_kind", ["repair_request", "sell", "contact"]);

/** new: not handled yet. replied: answered on WhatsApp. converted: became a ticket. */
export const inboxStatus = pgEnum("inbox_status", ["new", "replied", "converted", "archived"]);

export const inboxSubmissions = pgTable(
  "inbox_submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    kind: inboxKind("kind").notNull(),
    name: text("name").notNull(),
    // E.164, from normalizePhone().
    phoneE164: text("phone_e164").notNull(),
    // The language the form was filled in, for the reply.
    locale: locale("locale").notNull(),
    // The rest of the form, by kind; see src/lib/inbox.
    payload: jsonb("payload").notNull(),
    // Private bucket.
    photoKeys: text("photo_keys")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: inboxStatus("status").notNull().default("new"),
    convertedTicketId: integer("converted_ticket_id").references(() => repairTickets.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("inbox_submissions_status_idx").on(t.status, t.id),
    check(
      "inbox_submissions_converted",
      sql`${t.status} <> 'converted' OR ${t.convertedTicketId} IS NOT NULL`,
    ),
  ],
);

/**
 * Fixed-window counters for the public forms (src/lib/rate-limit.ts), kept in the
 * database so they hold across serverless instances. A key's row is reset when its
 * window has passed.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

// Orders and payments (M7). An order is made in the admin for a sale agreed on WhatsApp
// or in person; online checkout (M10) adds `source: online`. Its items take stock when
// it's made (src/lib/inventory.ts) and give it back if it's cancelled. Prices include VAT
// once the shop is registered: the order keeps the rate and TRN it was made with.

/**
 * pending: an online checkout waiting for payment (M10); manual orders start confirmed.
 * confirmed: agreed, stock taken. fulfilled: handed over or delivered. cancelled: stock
 * returned. refunded: money returned after fulfilment, stock optionally returned.
 */
export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
  "refunded",
]);

export const orderSource = pgEnum("order_source", ["manual", "online"]);

/** courier: delivered to an address. appointment: collected by appointment. */
export const deliveryMethod = pgEnum("delivery_method", ["courier", "appointment"]);

/** Order numbers, O-0001 onwards. */
export const orderNumbers = pgSequence("order_number_seq", { startWith: 1 });

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    number: text("number").notNull().unique(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    source: orderSource("source").notNull().default("manual"),
    status: orderStatus("status").notNull(),
    subtotalFils: integer("subtotal_fils").notNull(),
    deliveryFeeFils: integer("delivery_fee_fils").notNull().default(0),
    // The VAT inside the total (prices include it), 0 while the shop isn't registered.
    vatFils: integer("vat_fils").notNull().default(0),
    vatRateBps: integer("vat_rate_bps").notNull().default(0),
    // The shop's TRN when the order was made with VAT, for the tax invoice.
    trn: text("trn"),
    totalFils: integer("total_fils").notNull(),
    deliveryMethod: deliveryMethod("delivery_method").notNull(),
    emirate: emirate("emirate"),
    area: text("area"),
    addressLine: text("address_line"),
    landmark: text("landmark"),
    // Admin only.
    note: text("note"),
    // Online checkout (M10).
    providerSessionId: text("provider_session_id"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    // Whether the items went back into stock (on cancelling, or a refund with restock).
    stockReturned: boolean("stock_returned").notNull().default(false),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status, t.id),
    index("orders_customer_idx").on(t.customerId),
    check(
      "orders_money_non_negative",
      sql`${t.subtotalFils} >= 0 AND ${t.deliveryFeeFils} >= 0 AND ${t.vatFils} >= 0 AND ${t.vatRateBps} >= 0`,
    ),
    check(
      "orders_total",
      sql`${t.totalFils} = ${t.subtotalFils} + ${t.deliveryFeeFils} AND ${t.vatFils} <= ${t.totalFils}`,
    ),
    check("orders_vat_has_trn", sql`${t.vatRateBps} = 0 OR ${t.trn} IS NOT NULL`),
    check(
      "orders_courier_emirate",
      sql`${t.deliveryMethod} <> 'courier' OR ${t.emirate} IS NOT NULL`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // As sold, so the receipt doesn't change when the product is edited later.
    titleSnapshot: text("title_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    unitPriceFils: integer("unit_price_fils").notNull(),
    quantity: integer("quantity").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId, t.sort),
    index("order_items_product_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} >= 1`),
    check("order_items_price_non_negative", sql`${t.unitPriceFils} >= 0`),
  ],
);

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "cod",
  "bank_transfer",
  "card_online",
]);

/** deposit and payment count towards what's paid; refund takes it back. */
export const paymentKind = pgEnum("payment_kind", ["deposit", "payment", "refund"]);

/**
 * Money received or returned, for an order or a repair ticket. Recorded by hand until
 * online payments (M10). What's still due is calculated from these, never stored.
 */
export const payments = pgTable(
  "payments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "restrict" }),
    ticketId: integer("ticket_id").references(() => repairTickets.id, { onDelete: "restrict" }),
    kind: paymentKind("kind").notNull(),
    method: paymentMethod("method").notNull(),
    // Always positive; `kind` says which way it went.
    amountFils: integer("amount_fils").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    // The bank or card reference.
    providerRef: text("provider_ref"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_ticket_idx").on(t.ticketId),
    index("payments_received_idx").on(t.receivedAt),
    check("payments_one_target", sql`num_nonnulls(${t.orderId}, ${t.ticketId}) = 1`),
    check("payments_amount_positive", sql`${t.amountFils} > 0`),
  ],
);

// Admin sign-in (Better Auth, src/lib/auth). Better Auth reads and writes these through
// its Drizzle adapter by their property names, so the names follow its models. There is
// one admin, created with `pnpm admin:create`; sign-up is disabled.

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    // A scrypt hash, never the password.
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("auth_accounts_user_idx").on(t.userId)],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("auth_verifications_identifier_idx").on(t.identifier)],
);

export const authTwoFactors = pgTable(
  "auth_two_factors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // Encrypted with BETTER_AUTH_SECRET.
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("auth_two_factors_user_idx").on(t.userId)],
);

// Sign-in rate limits, kept in the database so they hold across serverless instances.
export const authRateLimits = pgTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type ProductStatus = (typeof productStatus.enumValues)[number];
export type ProductCondition = (typeof productCondition.enumValues)[number];
export type Emirate = (typeof emirate.enumValues)[number];
export type Customer = typeof customers.$inferSelect;
export type RepairTicket = typeof repairTickets.$inferSelect;
export type RepairQuote = typeof repairQuotes.$inferSelect;
export type RepairQuoteItem = typeof repairQuoteItems.$inferSelect;
export type RepairEvent = typeof repairEvents.$inferSelect;
export type RepairPhoto = typeof repairPhotos.$inferSelect;
export type RepairStatus = (typeof repairStatus.enumValues)[number];
export type RepairCloseReason = (typeof repairCloseReason.enumValues)[number];
export type RepairQuoteStatus = (typeof repairQuoteStatus.enumValues)[number];
export type RepairDecisionMethod = (typeof repairDecisionMethod.enumValues)[number];
export type RepairEventKind = (typeof repairEventKind.enumValues)[number];
export type RepairPhotoStage = (typeof repairPhotoStage.enumValues)[number];
export type RepairIntakeMethod = (typeof repairIntakeMethod.enumValues)[number];
export type InboxSubmission = typeof inboxSubmissions.$inferSelect;
export type InboxKind = (typeof inboxKind.enumValues)[number];
export type InboxStatus = (typeof inboxStatus.enumValues)[number];
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type DeliveryMethod = (typeof deliveryMethod.enumValues)[number];
export type Payment = typeof payments.$inferSelect;
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type PaymentKind = (typeof paymentKind.enumValues)[number];
