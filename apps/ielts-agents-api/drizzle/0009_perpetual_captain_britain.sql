CREATE TABLE "chat_writing" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" integer PRIMARY KEY NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	"task_type" text DEFAULT 'task-2' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_default" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	"task_type" text DEFAULT 'task-2' NOT NULL,
	CONSTRAINT "writing_default_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "writing_essay" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_writing_id" integer NOT NULL,
	"content" text NOT NULL,
	"word_count" integer NOT NULL,
	"time_spent" integer,
	"submitted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_evaluation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"essay_id" integer NOT NULL,
	"task_achievement" text NOT NULL,
	"coherence_cohesion" text NOT NULL,
	"lexical_resource" text NOT NULL,
	"grammatical_range" text NOT NULL,
	"overall_band" text NOT NULL,
	"feedback" jsonb NOT NULL,
	"corrections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"improved_paragraphs" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_task" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_writing_id" integer NOT NULL,
	"task_type" text NOT NULL,
	"prompt" text NOT NULL,
	"visual_description" text,
	"requirements" jsonb NOT NULL,
	"difficulty" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_writing" ADD CONSTRAINT "chat_writing_id_chat_id_fk" FOREIGN KEY ("id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "writing_default" ADD CONSTRAINT "writing_default_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "writing_essay" ADD CONSTRAINT "writing_essay_chat_writing_id_chat_writing_id_fk" FOREIGN KEY ("chat_writing_id") REFERENCES "public"."chat_writing"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "writing_evaluation" ADD CONSTRAINT "writing_evaluation_essay_id_writing_essay_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."writing_essay"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "writing_task" ADD CONSTRAINT "writing_task_chat_writing_id_chat_writing_id_fk" FOREIGN KEY ("chat_writing_id") REFERENCES "public"."chat_writing"("id") ON DELETE cascade ON UPDATE cascade;