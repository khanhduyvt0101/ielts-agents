import { relations } from "drizzle-orm";

import {
  chat,
  chatReading,
  readingAnswer,
  readingDefault,
  readingPassage,
  readingQuestion,
  readingSession,
  savedVocabulary,
  workspace,
} from "./app.ts";
import { account, user } from "./auth.ts";

export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  workspace: one(workspace),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspaceRelations = relations(workspace, ({ many }) => ({
  user: many(user),
  chats: many(chat),
}));

export const chatRelations = relations(chat, ({ one }) => ({
  workspace: one(workspace, {
    fields: [chat.workspaceId],
    references: [workspace.id],
  }),
  reading: one(chatReading),
}));

export const chatReadingRelations = relations(chatReading, ({ one, many }) => ({
  chat: one(chat, {
    fields: [chatReading.id],
    references: [chat.id],
  }),
  passage: one(readingPassage),
  questions: many(readingQuestion),
  sessions: many(readingSession),
  vocabulary: many(savedVocabulary),
}));

export const readingPassageRelations = relations(readingPassage, ({ one }) => ({
  chatReading: one(chatReading, {
    fields: [readingPassage.chatReadingId],
    references: [chatReading.id],
  }),
}));

export const readingQuestionRelations = relations(
  readingQuestion,
  ({ one }) => ({
    chatReading: one(chatReading, {
      fields: [readingQuestion.chatReadingId],
      references: [chatReading.id],
    }),
  }),
);

export const readingDefaultRelations = relations(readingDefault, ({ one }) => ({
  workspace: one(workspace, {
    fields: [readingDefault.workspaceId],
    references: [workspace.id],
  }),
}));

export const readingSessionRelations = relations(
  readingSession,
  ({ one, many }) => ({
    chatReading: one(chatReading, {
      fields: [readingSession.chatReadingId],
      references: [chatReading.id],
    }),
    answers: many(readingAnswer),
  }),
);

export const readingAnswerRelations = relations(readingAnswer, ({ one }) => ({
  session: one(readingSession, {
    fields: [readingAnswer.sessionId],
    references: [readingSession.id],
  }),
  question: one(readingQuestion, {
    fields: [readingAnswer.questionId],
    references: [readingQuestion.id],
  }),
}));

export const savedVocabularyRelations = relations(
  savedVocabulary,
  ({ one }) => ({
    chatReading: one(chatReading, {
      fields: [savedVocabulary.chatReadingId],
      references: [chatReading.id],
    }),
  }),
);
