CREATE TABLE "chat_listening" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" integer PRIMARY KEY NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_answer" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_answer" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_default" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	CONSTRAINT "listening_default_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "listening_question" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_listening_id" integer NOT NULL,
	"section_number" integer NOT NULL,
	"question_number" integer NOT NULL,
	"type" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_script" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_listening_id" integer NOT NULL,
	"section_number" integer NOT NULL,
	"section_type" text NOT NULL,
	"title" text NOT NULL,
	"script" text NOT NULL,
	"audio_url" text,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "listening_session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_listening_id" integer NOT NULL,
	"score" integer,
	"total_questions" integer,
	"time_spent" integer,
	"submitted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_listening" ADD CONSTRAINT "chat_listening_id_chat_id_fk" FOREIGN KEY ("id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_answer" ADD CONSTRAINT "listening_answer_session_id_listening_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."listening_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_answer" ADD CONSTRAINT "listening_answer_question_id_listening_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."listening_question"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_default" ADD CONSTRAINT "listening_default_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_question" ADD CONSTRAINT "listening_question_chat_listening_id_chat_listening_id_fk" FOREIGN KEY ("chat_listening_id") REFERENCES "public"."chat_listening"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_script" ADD CONSTRAINT "listening_script_chat_listening_id_chat_listening_id_fk" FOREIGN KEY ("chat_listening_id") REFERENCES "public"."chat_listening"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "listening_session" ADD CONSTRAINT "listening_session_chat_listening_id_chat_listening_id_fk" FOREIGN KEY ("chat_listening_id") REFERENCES "public"."chat_listening"("id") ON DELETE cascade ON UPDATE cascade;