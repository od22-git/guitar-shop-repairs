CREATE TYPE "public"."locale" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."repair_close_reason" AS ENUM('collected', 'delivered', 'abandoned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."repair_decision_method" AS ENUM('link', 'whatsapp', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."repair_event_kind" AS ENUM('status', 'update', 'correction', 'quote');--> statement-breakpoint
CREATE TYPE "public"."repair_intake_method" AS ENUM('drop_off', 'courier');--> statement-breakpoint
CREATE TYPE "public"."repair_photo_stage" AS ENUM('intake', 'progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."repair_quote_status" AS ENUM('pending', 'approved', 'declined', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('received', 'diagnosed', 'in_repair', 'ready', 'closed');--> statement-breakpoint
CREATE SEQUENCE "public"."repair_ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"preferred_locale" "locale" DEFAULT 'en' NOT NULL,
	"whatsapp_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE "repair_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repair_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"kind" "repair_event_kind" NOT NULL,
	"from_status" "repair_status",
	"to_status" "repair_status",
	"close_reason" "repair_close_reason",
	"quote_id" integer,
	"eta_date" date,
	"public_note" text,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "repair_events_status_change" CHECK ("repair_events"."kind" NOT IN ('status', 'correction') OR "repair_events"."to_status" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "repair_photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repair_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"stage" "repair_photo_stage" NOT NULL,
	"customer_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_photos_key_unique" UNIQUE("key"),
	CONSTRAINT "repair_photos_size_positive" CHECK ("repair_photos"."width" > 0 AND "repair_photos"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "repair_quote_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repair_quote_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_id" integer NOT NULL,
	"label" text NOT NULL,
	"amount_fils" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "repair_quote_items_amount_non_negative" CHECK ("repair_quote_items"."amount_fils" >= 0)
);
--> statement-breakpoint
CREATE TABLE "repair_quotes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repair_quotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" integer NOT NULL,
	"version" integer NOT NULL,
	"status" "repair_quote_status" DEFAULT 'pending' NOT NULL,
	"total_fils" integer NOT NULL,
	"notes" text,
	"decided_at" timestamp with time zone,
	"decision_method" "repair_decision_method",
	"decision_ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_quotes_total_non_negative" CHECK ("repair_quotes"."total_fils" >= 0),
	CONSTRAINT "repair_quotes_decision" CHECK (("repair_quotes"."decided_at" IS NULL) = ("repair_quotes"."decision_method" IS NULL) AND ("repair_quotes"."status" <> 'pending' OR "repair_quotes"."decided_at" IS NULL) AND ("repair_quotes"."status" NOT IN ('approved', 'declined') OR "repair_quotes"."decided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "repair_tickets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repair_tickets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"number" text NOT NULL,
	"public_token" text NOT NULL,
	"customer_id" integer NOT NULL,
	"instrument_brand" text,
	"instrument_model" text,
	"serial" text,
	"colour" text,
	"issue" text NOT NULL,
	"intake_notes" text,
	"accessories" text,
	"intake_method" "repair_intake_method" NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"eta_date" date,
	"status" "repair_status" DEFAULT 'received' NOT NULL,
	"close_reason" "repair_close_reason",
	"diagnosis_fee_fils" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_tickets_number_unique" UNIQUE("number"),
	CONSTRAINT "repair_tickets_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "repair_tickets_close_reason" CHECK (("repair_tickets"."status" = 'closed') = ("repair_tickets"."close_reason" IS NOT NULL)),
	CONSTRAINT "repair_tickets_fee_non_negative" CHECK (coalesce("repair_tickets"."diagnosis_fee_fils", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_quote_id_repair_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."repair_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_photos" ADD CONSTRAINT "repair_photos_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_quote_items" ADD CONSTRAINT "repair_quote_items_quote_id_repair_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."repair_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_quotes" ADD CONSTRAINT "repair_quotes_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repair_events_ticket_idx" ON "repair_events" USING btree ("ticket_id","id");--> statement-breakpoint
CREATE INDEX "repair_events_unsent_idx" ON "repair_events" USING btree ("ticket_id") WHERE "repair_events"."notified_at" IS NULL;--> statement-breakpoint
CREATE INDEX "repair_photos_ticket_idx" ON "repair_photos" USING btree ("ticket_id","id");--> statement-breakpoint
CREATE INDEX "repair_quote_items_quote_idx" ON "repair_quote_items" USING btree ("quote_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_quotes_version_unique" ON "repair_quotes" USING btree ("ticket_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_quotes_one_current" ON "repair_quotes" USING btree ("ticket_id") WHERE "repair_quotes"."status" <> 'superseded';--> statement-breakpoint
CREATE INDEX "repair_tickets_status_idx" ON "repair_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repair_tickets_customer_idx" ON "repair_tickets" USING btree ("customer_id");