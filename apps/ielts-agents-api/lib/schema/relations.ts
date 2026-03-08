import { relations } from "drizzle-orm";

import {
  chat,
  chatReading,
  readingDefault,
  readingPassage,
  readingQuestion,
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

export const chatReadingRelations = relations(
  chatReading,
  ({ one, many }) => ({
    chat: one(chat, {
      fields: [chatReading.id],
      references: [chat.id],
    }),
    passage: one(readingPassage),
    questions: many(readingQuestion),
  }),
);

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
