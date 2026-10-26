import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { ProductSpecs } from "../product-specs";

// Tables for the catalog and shop settings (M2). Repairs, customers and orders come in
// later milestones. Money columns are integer fils (1 AED = 100 fils); times are
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
