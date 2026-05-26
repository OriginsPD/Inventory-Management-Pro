CREATE TYPE "public"."asset_type" AS ENUM('TRACKER', 'SIM', 'PERIPHERAL', 'DASH_CAM', 'SD_CARD', 'PANIC_BUTTON', 'FUEL_SENSOR', 'KEYFOB', 'TRAVEL_ADAPTER');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('PERSON', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'REPLACED', 'PROMOTIONAL', 'RMA');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(50) NOT NULL,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "customer_type" DEFAULT 'COMPANY' NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"tax_id" varchar(50),
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid,
	"device_identifier" varchar(255),
	"customer_id" uuid,
	"action_type" varchar(50) NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255) NOT NULL,
	"asset_type" "asset_type" DEFAULT 'TRACKER' NOT NULL,
	"allowed_children" jsonb DEFAULT '[]' NOT NULL,
	"max_stock" integer DEFAULT 0 NOT NULL,
	"identifier_pattern" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_device_id" uuid NOT NULL,
	"linked_device_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"model_id" uuid NOT NULL,
	"status" "device_status" DEFAULT 'IN_STOCK' NOT NULL,
	"customer_id" uuid,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "qc_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"technician_id" varchar(255) DEFAULT 'Default Technician' NOT NULL,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"overall_status" varchar(50) NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" varchar(50) DEFAULT 'REVIEWER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_audit_logs" ADD CONSTRAINT "device_audit_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_audit_logs" ADD CONSTRAINT "device_audit_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_relationships" ADD CONSTRAINT "device_relationships_primary_device_id_devices_id_fk" FOREIGN KEY ("primary_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_relationships" ADD CONSTRAINT "device_relationships_linked_device_id_devices_id_fk" FOREIGN KEY ("linked_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_model_id_device_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."device_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qc_reports" ADD CONSTRAINT "qc_reports_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_audit_logs_device_id_idx" ON "device_audit_logs" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "device_audit_logs_device_identifier_idx" ON "device_audit_logs" USING btree ("device_identifier");--> statement-breakpoint
CREATE INDEX "device_audit_logs_customer_id_idx" ON "device_audit_logs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "device_relationships_primary_device_id_idx" ON "device_relationships" USING btree ("primary_device_id");--> statement-breakpoint
CREATE INDEX "device_relationships_linked_device_id_idx" ON "device_relationships" USING btree ("linked_device_id");--> statement-breakpoint
CREATE INDEX "device_relationships_unique_idx" ON "device_relationships" USING btree ("primary_device_id","linked_device_id");--> statement-breakpoint
CREATE INDEX "devices_model_id_idx" ON "devices" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "devices_status_idx" ON "devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_customer_id_idx" ON "devices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "qc_reports_device_id_idx" ON "qc_reports" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");