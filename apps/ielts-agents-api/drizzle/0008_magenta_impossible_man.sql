ALTER TABLE "chat_listening" ADD COLUMN "question_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_reading" ADD COLUMN "question_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_default" ADD COLUMN "question_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_default" ADD COLUMN "question_types" jsonb DEFAULT '[]'::jsonb NOT NULL;