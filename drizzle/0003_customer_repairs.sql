CREATE TYPE "public"."inbox_kind" AS ENUM('repair_request', 'sell', 'contact');--> statement-breakpoint
CREATE TYPE "public"."inbox_status" AS ENUM('new', 'replied', 'converted', 'archived');--> statement-breakpoint
CREATE TABLE "inbox_submissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inbox_submissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" "inbox_kind" NOT NULL,
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"locale" "locale" NOT NULL,
	"payload" jsonb NOT NULL,
	"photo_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "inbox_status" DEFAULT 'new' NOT NULL,
	"converted_ticket_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_submissions_converted" CHECK ("inbox_submissions"."status" <> 'converted' OR "inbox_submissions"."converted_ticket_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN "access_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN "access_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inbox_submissions" ADD CONSTRAINT "inbox_submissions_converted_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("converted_ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_submissions_status_idx" ON "inbox_submissions" USING btree ("status","id");