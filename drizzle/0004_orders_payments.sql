CREATE TYPE "public"."delivery_method" AS ENUM('courier', 'appointment');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('manual', 'online');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'fulfilled', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('deposit', 'payment', 'refund');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'cod', 'bank_transfer', 'card_online');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"title_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"unit_price_fils" integer NOT NULL,
	"quantity" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" >= 1),
	CONSTRAINT "order_items_price_non_negative" CHECK ("order_items"."unit_price_fils" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"source" "order_source" DEFAULT 'manual' NOT NULL,
	"status" "order_status" NOT NULL,
	"subtotal_fils" integer NOT NULL,
	"delivery_fee_fils" integer DEFAULT 0 NOT NULL,
	"vat_fils" integer DEFAULT 0 NOT NULL,
	"vat_rate_bps" integer DEFAULT 0 NOT NULL,
	"trn" text,
	"total_fils" integer NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"emirate" "emirate",
	"area" text,
	"address_line" text,
	"landmark" text,
	"note" text,
	"provider_session_id" text,
	"reserved_until" timestamp with time zone,
	"stock_returned" boolean DEFAULT false NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_money_non_negative" CHECK ("orders"."subtotal_fils" >= 0 AND "orders"."delivery_fee_fils" >= 0 AND "orders"."vat_fils" >= 0 AND "orders"."vat_rate_bps" >= 0),
	CONSTRAINT "orders_total" CHECK ("orders"."total_fils" = "orders"."subtotal_fils" + "orders"."delivery_fee_fils" AND "orders"."vat_fils" <= "orders"."total_fils"),
	CONSTRAINT "orders_vat_has_trn" CHECK ("orders"."vat_rate_bps" = 0 OR "orders"."trn" IS NOT NULL),
	CONSTRAINT "orders_courier_emirate" CHECK ("orders"."delivery_method" <> 'courier' OR "orders"."emirate" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer,
	"ticket_id" integer,
	"kind" "payment_kind" NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_fils" integer NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"provider_ref" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_one_target" CHECK (num_nonnulls("payments"."order_id", "payments"."ticket_id") = 1),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_fils" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id","sort");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_ticket_idx" ON "payments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "payments_received_idx" ON "payments" USING btree ("received_at");