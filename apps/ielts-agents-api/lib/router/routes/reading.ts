import type { AgentMessage } from "#./lib/types.ts";

import { TRPCError } from "@trpc/server";
import { generateId } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { InsufficientCreditsError } from "ielts-agents-internal-util";
import { z } from "zod";

import { bandScoreSchema } from "#./lib/band-score-schema.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { createAgentStream } from "#./lib/create-agent-stream.ts";
import { database } from "#./lib/database.ts";
import { defaultAgentConfigValue } from "#./lib/default-agent-config-value.ts";
import { insertChat } from "#./lib/insert-chat.ts";
import {
  chatReading,
  readingAnswer,
  readingDefault,
  readingSession,
  savedVocabulary,
} from "#./lib/schema/index.ts";
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
    const questionTypes =
      agentDefault?.questionTypes ?? defaultAgentConfigValue.questionTypes;
    const message: AgentMessage["reading"] = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    };
    const chatId = await database.transaction(async (tx) => {
      const id = await insertChat({ workspaceId: workspace.id, message, tx });
      await tx.insert(chatReading).values({ id, bandScore, questionTypes });
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
      sessions: chatData.reading.sessions,
      vocabulary: chatData.reading.vocabulary,
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
      questionTypes: chatData.reading.questionTypes,
    };
  });

export const getDefaultConfig = workspaceProcedure.query(async ({ ctx }) => {
  const defaultConfig = await database.query.readingDefault.findFirst({
    where: eq(readingDefault.workspaceId, ctx.workspace.id),
  });
  return {
    bandScore: defaultConfig?.bandScore ?? defaultAgentConfigValue.bandScore,
    questionTypes:
      defaultConfig?.questionTypes ?? defaultAgentConfigValue.questionTypes,
  };
});

export const updateConfig = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema.optional(),
      bandScore: bandScoreSchema.optional(),
      questionTypes: z.array(z.string()).optional(),
    }),
  )
  .mutation(
    async ({
      ctx: { workspace },
      input: { chatId, bandScore, questionTypes },
    }) => {
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
        if (questionTypes !== undefined)
          updateValues.questionTypes = questionTypes;
        if (Object.keys(updateValues).length > 0) {
          await database
            .update(chatReading)
            .set(updateValues)
            .where(eq(chatReading.id, chatId));
        }
      } else {
        const updateValues: Record<string, unknown> = {};
        if (bandScore) updateValues.bandScore = bandScore;
        if (questionTypes !== undefined)
          updateValues.questionTypes = questionTypes;
        await database
          .insert(readingDefault)
          .values({
            workspaceId: workspace.id,
            bandScore: bandScore ?? defaultAgentConfigValue.bandScore,
            questionTypes:
              questionTypes ?? defaultAgentConfigValue.questionTypes,
          })
          .onConflictDoUpdate({
            target: readingDefault.workspaceId,
            set: updateValues,
          });
      }
    },
  );

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
        with: { reading: true },
      });
      if (!chatData?.reading) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reading chat not found",
        });
      }
      const sessionId = await database.transaction(async (tx) => {
        let session = await tx.query.readingSession.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.chatReadingId, chatId), eq(table.submitted, false)),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });
        if (!session) {
          const [newSession] = await tx
            .insert(readingSession)
            .values({ chatReadingId: chatId })
            .returning();
          session = newSession;
        }
        const existingAnswer = await tx.query.readingAnswer.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.sessionId, session.id),
              eq(table.questionId, questionId),
            ),
        });
        await (existingAnswer
          ? tx
              .update(readingAnswer)
              .set({ userAnswer })
              .where(eq(readingAnswer.id, existingAnswer.id))
          : tx
              .insert(readingAnswer)
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
        reading: {
          with: {
            questions: true,
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
    // Check for already-submitted session first (idempotent double-submit)
    let latestSession = await database.query.readingSession.findFirst({
      where: (table, { eq }) => eq(table.chatReadingId, chatId),
      with: { answers: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
    // Create a session if none exists (user submitted without answering any questions)
    if (!latestSession) {
      const [newSession] = await database
        .insert(readingSession)
        .values({ chatReadingId: chatId })
        .returning();
      latestSession = { ...newSession, answers: [] };
    }
    // If already submitted, return cached result
    if (latestSession.submitted) {
      const questions = chatData.reading.questions;
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
    const questions = chatData.reading.questions;
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
    // Atomic update: only update if still unsubmitted (prevents concurrent double-submit)
    const updated = await database
      .update(readingSession)
      .set({
        submitted: true,
        score,
        totalQuestions: questions.length,
        timeSpent: timeSpent ?? null,
      })
      .where(
        and(
          eq(readingSession.id, session.id),
          eq(readingSession.submitted, false),
        ),
      )
      .returning();
    if (updated.length === 0) {
      // Already submitted by a concurrent request — return cached result
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
      with: { reading: true },
    });
    if (!chatData?.reading) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reading chat not found",
      });
    }
    const [session] = await database
      .insert(readingSession)
      .values({ chatReadingId: chatId })
      .returning();
    return { sessionId: session.id };
  });

export const saveVocabulary = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema,
      word: z.string().min(1),
      definition: z.string().min(1),
      exampleUsage: z.string().min(1),
      ieltsRelevance: z.string().min(1),
    }),
  )
  .mutation(
    async ({
      ctx: { workspace },
      input: { chatId, word, definition, exampleUsage, ieltsRelevance },
    }) => {
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
      const vocabId = await database.transaction(async (tx) => {
        const existing = await tx.query.savedVocabulary.findFirst({
          where: (table) =>
            and(
              eq(table.chatReadingId, chatId),
              eq(sql`lower(${table.word})`, word.toLowerCase()),
            ),
        });
        if (existing) return existing.id;
        const [vocab] = await tx
          .insert(savedVocabulary)
          .values({
            chatReadingId: chatId,
            word,
            definition,
            exampleUsage,
            ieltsRelevance,
          })
          .returning();
        return vocab.id;
      });
      return { id: vocabId };
    },
  );

export const removeVocabulary = workspaceProcedure
  .input(
    z.object({
      chatId: chatIdSchema,
      vocabularyId: z.number().int().positive(),
    }),
  )
  .mutation(async ({ ctx: { workspace }, input: { chatId, vocabularyId } }) => {
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
    await database
      .delete(savedVocabulary)
      .where(
        and(
          eq(savedVocabulary.id, vocabularyId),
          eq(savedVocabulary.chatReadingId, chatId),
        ),
      );
  });
