CREATE TABLE "chat" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"stream_id" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"used_credits" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_reading" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" integer PRIMARY KEY NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_default" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	CONSTRAINT "reading_default_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"stripe_customer_id" text NOT NULL,
	"changed_plans" jsonb NOT NULL,
	"aggregated_credits" integer NOT NULL,
	"used_credits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workspace_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "workspace_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "changed_plans_check" CHECK (jsonb_array_length("workspace"."changed_plans") > 0),
	CONSTRAINT "positive_credits_check" CHECK ("workspace"."used_credits" >= 0 AND "workspace"."aggregated_credits" >= 0),
	CONSTRAINT "sufficient_credits_check" CHECK ("workspace"."used_credits" <= "workspace"."aggregated_credits")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_reading" ADD CONSTRAINT "chat_reading_id_chat_id_fk" FOREIGN KEY ("id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reading_default" ADD CONSTRAINT "reading_default_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");