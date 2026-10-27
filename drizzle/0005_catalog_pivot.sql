ALTER TYPE "public"."product_kind" ADD VALUE 'device';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'accessory';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'part';--> statement-breakpoint
ALTER TYPE "public"."product_kind" ADD VALUE 'service_addon';--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text,
	"price_fils" integer NOT NULL,
	"compare_at_fils" integer,
	"custom_tone_slots" smallint DEFAULT 0 NOT NULL,
	"includes_pack" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_price_non_negative" CHECK ("product_variants"."price_fils" >= 0),
	CONSTRAINT "product_variants_compare_at_above_price" CHECK ("product_variants"."compare_at_fils" IS NULL OR "product_variants"."compare_at_fils" > "product_variants"."price_fils"),
	CONSTRAINT "product_variants_slots" CHECK ("product_variants"."custom_tone_slots" BETWEEN 0 AND 10)
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_stock_matches_status";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "placeholder_photos" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "in_the_box_en" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "in_the_box_ar" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id","sort");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_addon_no_stock" CHECK ("products"."kind"::text <> 'service_addon' OR "products"."quantity" = 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_matches_status" CHECK (CASE WHEN "products"."kind"::text = 'service_addon' THEN "products"."status" IN ('draft', 'available', 'archived') ELSE ("products"."status" NOT IN ('available', 'reserved') OR "products"."quantity" > 0) AND ("products"."status" <> 'sold' OR "products"."quantity" = 0) END);--> statement-breakpoint
-- The Midtown Gears categories (M10): guitars and parts are renamed in place, pedals and
-- amps go if nothing is in them, and `pnpm db:seed` adds Devices & bundles and Footswitches.
UPDATE "categories" SET "slug" = 'used-guitars', "name_en" = 'Used guitars', "name_ar" = 'جيتارات مستعملة', "sort" = 40 WHERE "slug" = 'electric-guitars';--> statement-breakpoint
UPDATE "categories" SET "slug" = 'parts-knobs', "name_en" = 'Parts & knobs', "name_ar" = 'قطع ومقابض', "sort" = 30 WHERE "slug" = 'parts-accessories';--> statement-breakpoint
DELETE FROM "categories" WHERE "slug" IN ('pedals', 'amps') AND NOT EXISTS (SELECT 1 FROM "products" WHERE "products"."category_id" = "categories"."id");
