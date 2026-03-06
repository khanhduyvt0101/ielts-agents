import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bandScoreSchema } from "#./lib/band-score-schema.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { database } from "#./lib/database.ts";
import { chat, chatReading, readingDefault } from "#./lib/schema/index.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

export const createReading = workspaceProcedure
  .input(
    z.object({
      prompt: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx: { workspace }, input: { prompt } }) => {
    const defaultConfig = await database.query.readingDefault.findFirst({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
    });
    const bandScore = defaultConfig?.bandScore ?? "6.5";
    const [newChat] = await database
      .insert(chat)
      .values({
        workspaceId: workspace.id,
        messages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            parts: [{ type: "text", text: prompt }],
          },
        ],
      })
      .returning({ id: chat.id });
    await database.insert(chatReading).values({
      id: newChat.id,
      bandScore,
    });
    return { id: newChat.id };
  });

export const getReadingConfig = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: { reading: true },
    });
    if (!chatData?.reading) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reading chat not found",
      });
    }
    return {
      bandScore: chatData.reading.bandScore,
    };
  });

export const updateConfig = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema.optional(),
      bandScore: bandScoreSchema.optional(),
    }),
  )
  .mutation(async ({ ctx: { workspace }, input: { chatId, bandScore } }) => {
    if (chatId) {
      const chatData = await database.query.chat.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
        columns: { id: true },
      });
      if (!chatData)
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      const updateValues: Record<string, unknown> = {};
      if (bandScore) updateValues.bandScore = bandScore;
      if (Object.keys(updateValues).length > 0) {
        await database
          .update(chatReading)
          .set(updateValues)
          .where(eq(chatReading.id, chatId));
      }
    } else {
      const existing = await database.query.readingDefault.findFirst({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      });
      const updateValues: Record<string, unknown> = {};
      if (bandScore) updateValues.bandScore = bandScore;
      if (existing) {
        if (Object.keys(updateValues).length > 0) {
          await database
            .update(readingDefault)
            .set(updateValues)
            .where(eq(readingDefault.workspaceId, workspace.id));
        }
      } else {
        await database.insert(readingDefault).values({
          workspaceId: workspace.id,
          bandScore: bandScore ?? "6.5",
        });
      }
    }
  });
