CREATE TABLE "listening_vocabulary" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_listening_id" integer NOT NULL,
	"word" text NOT NULL,
	"definition" text NOT NULL,
	"example_usage" text NOT NULL,
	"ielts_relevance" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listening_question" ADD COLUMN "script_quote" text;--> statement-breakpoint
ALTER TABLE "listening_question" ADD COLUMN "distractors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_question" ADD COLUMN "paraphrase" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "listening_vocabulary" ADD CONSTRAINT "listening_vocabulary_chat_listening_id_chat_listening_id_fk" FOREIGN KEY ("chat_listening_id") REFERENCES "public"."chat_listening"("id") ON DELETE cascade ON UPDATE cascade;