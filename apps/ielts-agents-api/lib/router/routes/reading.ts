import type { AgentMessage } from "#./lib/types.ts";

import { TRPCError } from "@trpc/server";
import { generateId } from "ai";
import { eq } from "drizzle-orm";
import { InsufficientCreditsError } from "ielts-agents-internal-util";
import { z } from "zod";

import { bandScoreSchema } from "#./lib/band-score-schema.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { createAgentStream } from "#./lib/create-agent-stream.ts";
import { database } from "#./lib/database.ts";
import { defaultAgentConfigValue } from "#./lib/default-agent-config-value.ts";
import { insertChat } from "#./lib/insert-chat.ts";
import { chatReading, readingDefault } from "#./lib/schema/index.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

export const createReading = workspaceProcedure
  .input(
    z.object({
      prompt: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx: { workspace }, input: { prompt } }) => {
    const availableCredits =
      workspace.aggregatedCredits - workspace.usedCredits;
    if (availableCredits <= 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        cause: new InsufficientCreditsError(),
      });
    }
    const agentDefault = await database.query.readingDefault.findFirst({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
    });
    const bandScore =
      agentDefault?.bandScore ?? defaultAgentConfigValue.bandScore;
    const message: AgentMessage["reading"] = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    };
    const chatId = await database.transaction(async (tx) => {
      const id = await insertChat({ workspaceId: workspace.id, message, tx });
      await tx.insert(chatReading).values({ id, bandScore });
      return id;
    });
    await createAgentStream("reading", chatId, [message], workspace.id);
    return { id: chatId };
  });

export const getReadingData = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: {
        reading: {
          with: {
            passage: true,
            questions: {
              orderBy: (table, { asc }) => [asc(table.questionNumber)],
            },
          },
        },
      },
    });
    if (!chatData?.reading) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reading chat not found",
      });
    }
    return {
      bandScore: chatData.reading.bandScore,
      passage: chatData.reading.passage ?? null,
      questions: chatData.reading.questions,
    };
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
