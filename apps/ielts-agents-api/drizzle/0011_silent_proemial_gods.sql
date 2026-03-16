CREATE TABLE "chat_speaking" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" integer PRIMARY KEY NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	"test_part" text DEFAULT 'full-test' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_audio_chunk" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"transcript_id" integer NOT NULL,
	"role" text NOT NULL,
	"audio_url" text NOT NULL,
	"start_time" integer,
	"end_time" integer,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_default" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"band_score" text DEFAULT '6.5' NOT NULL,
	"test_part" text DEFAULT 'full-test' NOT NULL,
	CONSTRAINT "speaking_default_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "speaking_evaluation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"transcript_id" integer NOT NULL,
	"fluency_coherence" text NOT NULL,
	"lexical_resource" text NOT NULL,
	"grammatical_range" text NOT NULL,
	"pronunciation" text NOT NULL,
	"overall_band" text NOT NULL,
	"feedback" jsonb NOT NULL,
	"corrections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"improved_responses" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_transcript" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"chat_speaking_id" integer NOT NULL,
	"test_part" text NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration" integer,
	"cue_card_topic" text
);
--> statement-breakpoint
ALTER TABLE "chat_speaking" ADD CONSTRAINT "chat_speaking_id_chat_id_fk" FOREIGN KEY ("id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaking_audio_chunk" ADD CONSTRAINT "speaking_audio_chunk_transcript_id_speaking_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."speaking_transcript"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaking_default" ADD CONSTRAINT "speaking_default_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaking_evaluation" ADD CONSTRAINT "speaking_evaluation_transcript_id_speaking_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."speaking_transcript"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaking_transcript" ADD CONSTRAINT "speaking_transcript_chat_speaking_id_chat_speaking_id_fk" FOREIGN KEY ("chat_speaking_id") REFERENCES "public"."chat_speaking"("id") ON DELETE cascade ON UPDATE cascade;