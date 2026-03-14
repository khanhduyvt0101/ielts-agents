import { relations } from "drizzle-orm";

import {
  chat,
  chatListening,
  chatReading,
  listeningAnswer,
  listeningDefault,
  listeningQuestion,
  listeningScript,
  listeningSession,
  listeningVocabulary,
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
  listening: one(chatListening),
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

// ── Listening Relations ────────────────────────────────────────────────

export const chatListeningRelations = relations(
  chatListening,
  ({ one, many }) => ({
    chat: one(chat, {
      fields: [chatListening.id],
      references: [chat.id],
    }),
    scripts: many(listeningScript),
    questions: many(listeningQuestion),
    sessions: many(listeningSession),
    vocabulary: many(listeningVocabulary),
  }),
);

export const listeningScriptRelations = relations(
  listeningScript,
  ({ one }) => ({
    chatListening: one(chatListening, {
      fields: [listeningScript.chatListeningId],
      references: [chatListening.id],
    }),
  }),
);

export const listeningQuestionRelations = relations(
  listeningQuestion,
  ({ one }) => ({
    chatListening: one(chatListening, {
      fields: [listeningQuestion.chatListeningId],
      references: [chatListening.id],
    }),
  }),
);

export const listeningDefaultRelations = relations(
  listeningDefault,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [listeningDefault.workspaceId],
      references: [workspace.id],
    }),
  }),
);

export const listeningSessionRelations = relations(
  listeningSession,
  ({ one, many }) => ({
    chatListening: one(chatListening, {
      fields: [listeningSession.chatListeningId],
      references: [chatListening.id],
    }),
    answers: many(listeningAnswer),
  }),
);

export const listeningAnswerRelations = relations(
  listeningAnswer,
  ({ one }) => ({
    session: one(listeningSession, {
      fields: [listeningAnswer.sessionId],
      references: [listeningSession.id],
    }),
    question: one(listeningQuestion, {
      fields: [listeningAnswer.questionId],
      references: [listeningQuestion.id],
    }),
  }),
);

export const listeningVocabularyRelations = relations(
  listeningVocabulary,
  ({ one }) => ({
    chatListening: one(chatListening, {
      fields: [listeningVocabulary.chatListeningId],
      references: [chatListening.id],
    }),
  }),
);
