CREATE TYPE "public"."emirate" AS ENUM('abu_dhabi', 'dubai', 'sharjah', 'ajman', 'umm_al_quwain', 'ras_al_khaimah', 'fujairah');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('mint', 'excellent', 'very_good', 'good', 'fair');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('guitar', 'gear');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'available', 'reserved', 'sold', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "delivery_zones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"emirates" "emirate"[] NOT NULL,
	"fee_fils" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "delivery_zones_fee_non_negative" CHECK ("delivery_zones"."fee_fils" >= 0),
	CONSTRAINT "delivery_zones_has_emirates" CHECK (cardinality("delivery_zones"."emirates") > 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt_en" text,
	"alt_ar" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_key_unique" UNIQUE("key"),
	CONSTRAINT "product_images_size_positive" CHECK ("product_images"."width" > 0 AND "product_images"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" "product_kind" NOT NULL,
	"category_id" integer,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"brand" text,
	"model" text,
	"year" smallint,
	"title_en" text NOT NULL,
	"title_ar" text,
	"description_en" text,
	"description_ar" text,
	"tech_notes_en" text,
	"tech_notes_ar" text,
	"condition" "product_condition",
	"price_fils" integer,
	"compare_at_fils" integer,
	"cost_fils" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"reserved_note" text,
	"reserved_until" timestamp with time zone,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_quantity_non_negative" CHECK ("products"."quantity" >= 0),
	CONSTRAINT "products_guitar_single" CHECK ("products"."kind" <> 'guitar' OR "products"."quantity" <= 1),
	CONSTRAINT "products_money_non_negative" CHECK (coalesce("products"."price_fils", 0) >= 0 AND coalesce("products"."cost_fils", 0) >= 0),
	CONSTRAINT "products_compare_at_above_price" CHECK ("products"."compare_at_fils" IS NULL OR "products"."compare_at_fils" > "products"."price_fils"),
	CONSTRAINT "products_listed_complete" CHECK ("products"."status" IN ('draft', 'archived') OR ("products"."price_fils" IS NOT NULL AND "products"."category_id" IS NOT NULL AND "products"."published_at" IS NOT NULL)),
	CONSTRAINT "products_stock_matches_status" CHECK (("products"."status" NOT IN ('available', 'reserved') OR "products"."quantity" > 0) AND ("products"."status" <> 'sold' OR "products"."quantity" = 0)),
	CONSTRAINT "products_reserved_single" CHECK ("products"."status" <> 'reserved' OR "products"."quantity" = 1),
	CONSTRAINT "products_year_plausible" CHECK ("products"."year" IS NULL OR "products"."year" BETWEEN 1900 AND 2100)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","sort");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");