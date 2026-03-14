import type { AgentMessage } from "#./lib/types.ts";

import { TRPCError } from "@trpc/server";
import { generateId } from "ai";
import { and, eq } from "drizzle-orm";
import { InsufficientCreditsError } from "ielts-agents-internal-util";
import { z } from "zod";

import { bandScoreSchema } from "#./lib/band-score-schema.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { createAgentStream } from "#./lib/create-agent-stream.ts";
import { database } from "#./lib/database.ts";
import { defaultAgentConfigValue } from "#./lib/default-agent-config-value.ts";
import { insertChat } from "#./lib/insert-chat.ts";
import {
  chatListening,
  listeningAnswer,
  listeningDefault,
  listeningSession,
} from "#./lib/schema/index.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

export const createListening = workspaceProcedure
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
    const agentDefault = await database.query.listeningDefault.findFirst({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
    });
    const bandScore =
      agentDefault?.bandScore ?? defaultAgentConfigValue.bandScore;
    const message: AgentMessage["listening"] = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    };
    const chatId = await database.transaction(async (tx) => {
      const id = await insertChat({ workspaceId: workspace.id, message, tx });
      await tx.insert(chatListening).values({ id, bandScore });
      return id;
    });
    await createAgentStream("listening", chatId, [message], workspace.id);
    return { id: chatId };
  });

export const getListeningData = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: {
        listening: {
          with: {
            scripts: {
              orderBy: (table, { asc }) => [asc(table.sectionNumber)],
            },
            questions: {
              orderBy: (table, { asc }) => [asc(table.questionNumber)],
            },
            sessions: {
              with: { answers: true },
              orderBy: (table, { desc }) => [desc(table.createdAt)],
            },
            vocabulary: {
              orderBy: (table, { desc }) => [desc(table.createdAt)],
            },
          },
        },
      },
    });
    if (!chatData?.listening) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Listening chat not found",
      });
    }
    return {
      bandScore: chatData.listening.bandScore,
      scripts: chatData.listening.scripts,
      questions: chatData.listening.questions,
      sessions: chatData.listening.sessions,
      vocabulary: chatData.listening.vocabulary,
    };
  });

export const getListeningConfig = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .query(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: { listening: true },
    });
    if (!chatData?.listening) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Listening chat not found",
      });
    }
    return {
      bandScore: chatData.listening.bandScore,
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
          .update(chatListening)
          .set(updateValues)
          .where(eq(chatListening.id, chatId));
      }
    } else {
      const existing = await database.query.listeningDefault.findFirst({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      });
      const updateValues: Record<string, unknown> = {};
      if (bandScore) updateValues.bandScore = bandScore;
      if (existing) {
        if (Object.keys(updateValues).length > 0) {
          await database
            .update(listeningDefault)
            .set(updateValues)
            .where(eq(listeningDefault.workspaceId, workspace.id));
        }
      } else {
        await database.insert(listeningDefault).values({
          workspaceId: workspace.id,
          bandScore: bandScore ?? "6.5",
        });
      }
    }
  });

export const saveAnswer = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema,
      questionId: z.number().int().positive(),
      userAnswer: z.string(),
    }),
  )
  .mutation(
    async ({
      ctx: { workspace },
      input: { chatId, questionId, userAnswer },
    }) => {
      const chatData = await database.query.chat.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
        with: { listening: true },
      });
      if (!chatData?.listening) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listening chat not found",
        });
      }
      const sessionId = await database.transaction(async (tx) => {
        let session = await tx.query.listeningSession.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.chatListeningId, chatId), eq(table.submitted, false)),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });
        if (!session) {
          const [newSession] = await tx
            .insert(listeningSession)
            .values({ chatListeningId: chatId })
            .returning();
          session = newSession;
        }
        const existingAnswer = await tx.query.listeningAnswer.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.sessionId, session.id),
              eq(table.questionId, questionId),
            ),
        });
        await (existingAnswer
          ? tx
              .update(listeningAnswer)
              .set({ userAnswer })
              .where(eq(listeningAnswer.id, existingAnswer.id))
          : tx
              .insert(listeningAnswer)
              .values({ sessionId: session.id, questionId, userAnswer }));
        return session.id;
      });
      return { sessionId };
    },
  );

export const submitSession = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema,
      timeSpent: z.number().int().nonnegative().optional(),
    }),
  )
  .mutation(async ({ ctx: { workspace }, input: { chatId, timeSpent } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: {
        listening: {
          with: {
            questions: true,
          },
        },
      },
    });
    if (!chatData?.listening) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Listening chat not found",
      });
    }
    const latestSession = await database.query.listeningSession.findFirst({
      where: (table, { eq }) => eq(table.chatListeningId, chatId),
      with: { answers: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    if (!latestSession) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No session found",
      });
    }
    if (latestSession.submitted) {
      const questions = chatData.listening.questions;
      const answerMap = new Map(
        latestSession.answers.map((a) => [a.questionId, a.userAnswer]),
      );
      const results = questions.map((q) => ({
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionType: q.type,
        userAnswer: answerMap.get(q.id) ?? "",
        correctAnswer: q.correctAnswer,
        isCorrect:
          (answerMap.get(q.id) ?? "").trim().toLowerCase() ===
          q.correctAnswer.trim().toLowerCase(),
      }));
      return {
        sessionId: latestSession.id,
        score: latestSession.score ?? 0,
        totalQuestions: latestSession.totalQuestions ?? questions.length,
        results,
      };
    }
    const session = latestSession;
    const questions = chatData.listening.questions;
    const answerMap = new Map(
      session.answers.map((a) => [a.questionId, a.userAnswer]),
    );
    let score = 0;
    const results: {
      questionId: number;
      questionNumber: number;
      questionType: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
    }[] = [];
    for (const q of questions) {
      const userAnswer = (answerMap.get(q.id) ?? "").trim().toLowerCase();
      const isCorrect = userAnswer === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) score++;
      results.push({
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionType: q.type,
        userAnswer: answerMap.get(q.id) ?? "",
        correctAnswer: q.correctAnswer,
        isCorrect,
      });
    }
    const updated = await database
      .update(listeningSession)
      .set({
        submitted: true,
        score,
        totalQuestions: questions.length,
        timeSpent: timeSpent ?? null,
      })
      .where(
        and(
          eq(listeningSession.id, session.id),
          eq(listeningSession.submitted, false),
        ),
      )
      .returning();
    if (updated.length === 0) {
      return {
        sessionId: session.id,
        score,
        totalQuestions: questions.length,
        results,
      };
    }
    return {
      sessionId: session.id,
      score,
      totalQuestions: questions.length,
      results,
    };
  });

export const retakeSession = workspaceProcedure
  .input(z.object({ chatId: chatIdSchema }))
  .mutation(async ({ ctx: { workspace }, input: { chatId } }) => {
    const chatData = await database.query.chat.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
      with: { listening: true },
    });
    if (!chatData?.listening) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Listening chat not found",
      });
    }
    const [session] = await database
      .insert(listeningSession)
      .values({ chatListeningId: chatId })
      .returning();
    return { sessionId: session.id };
  });
