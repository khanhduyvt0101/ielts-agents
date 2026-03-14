import type { UIMessage } from "ai";
import type { ChangedPlan } from "ielts-agents-internal-util";

import type { BandScore } from "#./lib/band-score.ts";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth.ts";

function timestamps() {
  return {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  };
}

export const workspace = pgTable(
  "workspace",
  {
    ...timestamps(),
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .unique()
      .references(() => user.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      }),
    stripeCustomerId: text("stripe_customer_id").unique().notNull(),
    changedPlans: jsonb("changed_plans").$type<ChangedPlan[]>().notNull(),
    aggregatedCredits: integer("aggregated_credits").notNull(),
    usedCredits: integer("used_credits").default(0).notNull(),
  },
  (table) => [
    check(
      "changed_plans_check",
      sql`jsonb_array_length(${table.changedPlans}) > 0`,
    ),
    check(
      "positive_credits_check",
      sql`${table.usedCredits} >= 0 AND ${table.aggregatedCredits} >= 0`,
    ),
    check(
      "sufficient_credits_check",
      sql`${table.usedCredits} <= ${table.aggregatedCredits}`,
    ),
  ],
);

export const chat = pgTable("chat", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspace.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  streamId: text("stream_id").default("").notNull(),
  name: text("name").default("").notNull(),
  emoji: text("emoji").default("").notNull(),
  messages: jsonb("messages").$type<UIMessage[]>().default([]).notNull(),
  suggestions: jsonb("suggestions").$type<string[]>().default([]).notNull(),
  usedCredits: integer("used_credits").default(0).notNull(),
});

export const chatReading = pgTable("chat_reading", {
  ...timestamps(),
  id: integer("id")
    .primaryKey()
    .references(() => chat.id, { onUpdate: "cascade", onDelete: "cascade" }),
  bandScore: text("band_score").$type<BandScore>().default("6.5").notNull(),
});

export const readingPassage = pgTable("reading_passage", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatReadingId: integer("chat_reading_id")
    .notNull()
    .references(() => chatReading.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(),
});

export const readingQuestion = pgTable("reading_question", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatReadingId: integer("chat_reading_id")
    .notNull()
    .references(() => chatReading.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  questionNumber: integer("question_number").notNull(),
  type: text("type")
    .$type<
      | "true-false-not-given"
      | "yes-no-not-given"
      | "multiple-choice"
      | "fill-in-the-blank"
      | "matching-headings"
      | "sentence-completion"
      | "summary-completion"
      | "table-completion"
    >()
    .notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  linearthinking: text("linearthinking").default("").notNull(),
  passageQuote: text("passage_quote"),
  distractors: jsonb("distractors")
    .$type<{ text: string; explanation: string }[]>()
    .default([])
    .notNull(),
  paraphrase: jsonb("paraphrase")
    .$type<{ questionPhrase: string; passagePhrase: string } | null>()
    .default(null),
  tableData: jsonb("table_data")
    .$type<{
      title: string;
      columnHeaders: string[];
      rows: { header: string; cells: string[] }[];
    } | null>()
    .default(null),
});

export const readingDefault = pgTable("reading_default", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .unique()
    .notNull()
    .references(() => workspace.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  bandScore: text("band_score").$type<BandScore>().default("6.5").notNull(),
});

export const readingSession = pgTable("reading_session", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatReadingId: integer("chat_reading_id")
    .notNull()
    .references(() => chatReading.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  timeSpent: integer("time_spent"),
  submitted: boolean("submitted").default(false).notNull(),
});

export const readingAnswer = pgTable("reading_answer", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => readingSession.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  questionId: integer("question_id")
    .notNull()
    .references(() => readingQuestion.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  userAnswer: text("user_answer").default("").notNull(),
});

export const savedVocabulary = pgTable("saved_vocabulary", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatReadingId: integer("chat_reading_id")
    .notNull()
    .references(() => chatReading.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  word: text("word").notNull(),
  definition: text("definition").notNull(),
  exampleUsage: text("example_usage").notNull(),
  ieltsRelevance: text("ielts_relevance").notNull(),
});

// ── Listening ──────────────────────────────────────────────────────────

export const chatListening = pgTable("chat_listening", {
  ...timestamps(),
  id: integer("id")
    .primaryKey()
    .references(() => chat.id, { onUpdate: "cascade", onDelete: "cascade" }),
  bandScore: text("band_score").$type<BandScore>().default("6.5").notNull(),
});

export const listeningScript = pgTable("listening_script", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatListeningId: integer("chat_listening_id")
    .notNull()
    .references(() => chatListening.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  sectionNumber: integer("section_number").notNull(),
  sectionType: text("section_type")
    .$type<"conversation" | "monologue" | "discussion" | "lecture">()
    .notNull(),
  title: text("title").notNull(),
  script: text("script").notNull(),
  audioUrl: text("audio_url"),
  duration: integer("duration"),
});

export const listeningQuestion = pgTable("listening_question", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatListeningId: integer("chat_listening_id")
    .notNull()
    .references(() => chatListening.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  sectionNumber: integer("section_number").notNull(),
  questionNumber: integer("question_number").notNull(),
  type: text("type")
    .$type<
      | "multiple-choice"
      | "matching"
      | "plan-map-diagram"
      | "form-completion"
      | "note-completion"
      | "table-completion"
      | "flow-chart-completion"
      | "summary-completion"
      | "sentence-completion"
      | "short-answer"
    >()
    .notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  scriptQuote: text("script_quote"),
  distractors: jsonb("distractors")
    .$type<{ text: string; explanation: string }[]>()
    .default([])
    .notNull(),
  paraphrase: jsonb("paraphrase")
    .$type<{ questionPhrase: string; scriptPhrase: string } | null>()
    .default(null),
});

export const listeningDefault = pgTable("listening_default", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .unique()
    .notNull()
    .references(() => workspace.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  bandScore: text("band_score").$type<BandScore>().default("6.5").notNull(),
});

export const listeningSession = pgTable("listening_session", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatListeningId: integer("chat_listening_id")
    .notNull()
    .references(() => chatListening.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  timeSpent: integer("time_spent"),
  submitted: boolean("submitted").default(false).notNull(),
});

export const listeningAnswer = pgTable("listening_answer", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => listeningSession.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  questionId: integer("question_id")
    .notNull()
    .references(() => listeningQuestion.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  userAnswer: text("user_answer").default("").notNull(),
});

export const listeningVocabulary = pgTable("listening_vocabulary", {
  ...timestamps(),
  id: serial("id").primaryKey(),
  chatListeningId: integer("chat_listening_id")
    .notNull()
    .references(() => chatListening.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  word: text("word").notNull(),
  definition: text("definition").notNull(),
  exampleUsage: text("example_usage").notNull(),
  ieltsRelevance: text("ielts_relevance").notNull(),
});
