ALTER TABLE "reading_question" ADD COLUMN "passage_quote" text;--> statement-breakpoint
ALTER TABLE "reading_question" ADD COLUMN "distractors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_question" ADD COLUMN "paraphrase" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "reading_question" ADD COLUMN "table_data" jsonb DEFAULT 'null'::jsonb;