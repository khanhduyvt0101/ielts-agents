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
import { insertChat } from "#./lib/insert-chat.ts";
import {
  chatWriting,
  writingDefault,
  writingEssay,
} from "#./lib/schema/index.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

const defaultWritingConfig = {
  bandScore: "6.5" as const,
  taskType: "task-2" as const,
};

export const createWriting = workspaceProcedure
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
    const agentDefault = await database.query.writingDefault.findFirst({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
    });
    const bandScore = agentDefault?.bandScore ?? defaultWritingConfig.bandScore;
    const taskType = agentDefault?.taskType ?? defaultWritingConfig.taskType;
    const message: AgentMessage["writing"] = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    };
    const chatId = await database.transaction(async (tx) => {
      const id = await insertChat({ workspaceId: workspace.id, message, tx });
      await tx.insert(chatWriting).values({ id, bandScore, taskType });
      return id;
    });
    await createAgentStream("writing", chatId, [message], workspace.id);
    return { id: chatId };
  });

export const getWritingData = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: {
        writing: {
          with: {
            task: true,
            essays: {
              with: { evaluation: true },
              orderBy: (table, { desc }) => [desc(table.createdAt)],
            },
          },
        },
      },
    });
    if (!chatData?.writing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Writing chat not found",
      });
    }
    return {
      bandScore: chatData.writing.bandScore,
      taskType: chatData.writing.taskType,
      task: chatData.writing.task ?? null,
      essays: chatData.writing.essays,
    };
  });

export const getWritingConfig = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: { writing: true },
    });
    if (!chatData?.writing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Writing chat not found",
      });
    }
    return {
      bandScore: chatData.writing.bandScore,
      taskType: chatData.writing.taskType,
    };
  });

export const getDefaultConfig = workspaceProcedure.query(async ({ ctx }) => {
  const defaultConfig = await database.query.writingDefault.findFirst({
    where: eq(writingDefault.workspaceId, ctx.workspace.id),
  });
  return {
    bandScore: defaultConfig?.bandScore ?? defaultWritingConfig.bandScore,
    taskType: defaultConfig?.taskType ?? defaultWritingConfig.taskType,
  };
});

export const updateConfig = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema.optional(),
      bandScore: bandScoreSchema.optional(),
      taskType: z.enum(["task-1", "task-2"]).optional(),
    }),
  )
  .mutation(
    async ({ ctx: { workspace }, input: { chatId, bandScore, taskType } }) => {
      if (chatId) {
        const chatData = await database.query.chat.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
          columns: { id: true },
        });
        if (!chatData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat not found",
          });
        }
        const updateValues: Record<string, unknown> = {};
        if (bandScore) updateValues.bandScore = bandScore;
        if (taskType) updateValues.taskType = taskType;
        if (Object.keys(updateValues).length > 0) {
          await database
            .update(chatWriting)
            .set(updateValues)
            .where(eq(chatWriting.id, chatId));
        }
      } else {
        const updateValues: Record<string, unknown> = {};
        if (bandScore) updateValues.bandScore = bandScore;
        if (taskType) updateValues.taskType = taskType;
        await database
          .insert(writingDefault)
          .values({
            workspaceId: workspace.id,
            bandScore: bandScore ?? defaultWritingConfig.bandScore,
            taskType: taskType ?? defaultWritingConfig.taskType,
          })
          .onConflictDoUpdate({
            target: writingDefault.workspaceId,
            set: updateValues,
          });
      }
    },
  );

export const submitEssay = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema,
      content: z.string().min(1).max(10_000),
      wordCount: z.number().int().nonnegative(),
      timeSpent: z.number().int().nonnegative().optional(),
    }),
  )
  .mutation(
    async ({
      ctx: { workspace },
      input: { chatId, content, wordCount, timeSpent },
    }) => {
      const chatData = await database.query.chat.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
        with: { writing: true },
      });
      if (!chatData?.writing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Writing chat not found",
        });
      }
      // Check for already-submitted essay with same content (prevent double submit)
      const existingEssay = await database.query.writingEssay.findFirst({
        where: (table, { eq, and }) =>
          and(eq(table.chatWritingId, chatId), eq(table.submitted, true)),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        columns: { id: true, content: true },
      });
      if (existingEssay?.content === content)
        return { essayId: existingEssay.id };
      const [essay] = await database
        .insert(writingEssay)
        .values({
          chatWritingId: chatId,
          content,
          wordCount,
          timeSpent: timeSpent ?? null,
          submitted: true,
        })
        .returning();
      return { essayId: essay.id };
    },
  );
