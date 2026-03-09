CREATE TABLE "reading_answer" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_answer" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_reading_id" integer NOT NULL,
	"score" integer,
	"total_questions" integer,
	"time_spent" integer,
	"submitted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_vocabulary" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_reading_id" integer NOT NULL,
	"word" text NOT NULL,
	"definition" text NOT NULL,
	"example_usage" text NOT NULL,
	"ielts_relevance" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reading_answer" ADD CONSTRAINT "reading_answer_session_id_reading_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."reading_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reading_answer" ADD CONSTRAINT "reading_answer_question_id_reading_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."reading_question"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_chat_reading_id_chat_reading_id_fk" FOREIGN KEY ("chat_reading_id") REFERENCES "public"."chat_reading"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "saved_vocabulary" ADD CONSTRAINT "saved_vocabulary_chat_reading_id_chat_reading_id_fk" FOREIGN KEY ("chat_reading_id") REFERENCES "public"."chat_reading"("id") ON DELETE cascade ON UPDATE cascade;