CREATE TABLE "reading_passage" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_reading_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"topic" text NOT NULL,
	"difficulty" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_question" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_reading_id" integer NOT NULL,
	"question_number" integer NOT NULL,
	"type" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reading_passage" ADD CONSTRAINT "reading_passage_chat_reading_id_chat_reading_id_fk" FOREIGN KEY ("chat_reading_id") REFERENCES "public"."chat_reading"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reading_question" ADD CONSTRAINT "reading_question_chat_reading_id_chat_reading_id_fk" FOREIGN KEY ("chat_reading_id") REFERENCES "public"."chat_reading"("id") ON DELETE cascade ON UPDATE cascade;