import type { UIMessage } from "ai";
import type { ToolSet } from "ai";

import type { SpeakingToolContext } from "#./lib/speaking-tool-context.ts";

import { tool } from "ai";
import { z } from "zod";

import { database } from "#./lib/database.ts";
import { speakingEvaluation, speakingTranscript } from "#./lib/schema/index.ts";

function extractTranscriptFromMessages(
  messages: UIMessage[],
): { role: string; text: string; timestamp: number }[] {
  const entries: { role: string; text: string; timestamp: number }[] = [];
  for (const msg of messages) {
    const role = msg.role === "user" ? "candidate" : "examiner";
    for (const part of msg.parts) {
      if (part.type === "text" && part.text.trim()) {
        entries.push({
          role,
          text: part.text,
          timestamp: entries.length * 1000,
        });
      }
    }
  }
  return entries;
}

const evaluateSpeaking = tool({
  description:
    "Evaluate a candidate's IELTS Speaking test performance against the 4 official band descriptors. Call this after reviewing the conversation. Provide detailed scores, feedback, corrections, model phrases, and improved responses.",
  inputSchema: z.object({
    fluencyCoherence: z
      .string()
      .describe("Band score for Fluency & Coherence (e.g. '7.0')"),
    lexicalResource: z
      .string()
      .describe("Band score for Lexical Resource (e.g. '6.5')"),
    grammaticalRange: z
      .string()
      .describe("Band score for Grammatical Range & Accuracy (e.g. '7.0')"),
    pronunciation: z
      .string()
      .describe("Band score for Pronunciation (e.g. '6.5')"),
    overallBand: z.string().describe("Overall band score (e.g. '7.0')"),
    feedback: z
      .array(
        z.object({
          criterion: z.string().describe("The IELTS criterion name"),
          score: z.string().describe("The band score for this criterion"),
          comments: z.string().describe("Detailed comments on this criterion"),
          strengths: z.array(z.string()).describe("What the student did well"),
          improvements: z
            .array(z.string())
            .describe("What the student should improve"),
        }),
      )
      .describe("Detailed feedback for each of the 4 criteria"),
    corrections: z
      .array(
        z.object({
          original: z.string().describe("The original phrase from the student"),
          corrected: z.string().describe("The corrected version"),
          explanation: z.string().describe("Why this correction is needed"),
          type: z
            .string()
            .describe(
              "Type of error (grammar, vocabulary, pronunciation, etc.)",
            ),
        }),
      )
      .describe("Specific corrections for errors in the student's speech"),
    modelPhrases: z
      .array(z.string())
      .describe(
        "Model phrases the student could use to improve their speaking",
      ),
    improvedResponses: z
      .array(
        z.object({
          original: z
            .string()
            .describe("The original response from the student"),
          improved: z.string().describe("The improved version"),
          explanation: z.string().describe("What was improved and why"),
        }),
      )
      .describe("Improved versions of weak responses"),
  }),
  execute: async (
    {
      fluencyCoherence,
      lexicalResource,
      grammaticalRange,
      pronunciation,
      overallBand,
      feedback,
      corrections,
      modelPhrases,
      improvedResponses,
    },
    { experimental_context },
  ) => {
    const ctx = experimental_context as SpeakingToolContext;

    let transcript = await database.query.speakingTranscript.findFirst({
      where: (table, { eq }) => eq(table.chatSpeakingId, ctx.id),
      orderBy: (table, { desc }) => desc(table.createdAt),
    });

    // Auto-create transcript from chat messages if none exists (text-based mode)
    if (!transcript) {
      const chatData = await database.query.chat.findFirst({
        where: (table, { eq }) => eq(table.id, ctx.id),
        columns: { messages: true },
        with: { speaking: true },
      });
      if (!chatData?.speaking) return { error: "Speaking chat not found" };

      const transcriptEntries = extractTranscriptFromMessages(
        chatData.messages,
      );
      const testPart =
        chatData.speaking.testPart === "full-test"
          ? "part-1"
          : chatData.speaking.testPart;

      const [created] = await database
        .insert(speakingTranscript)
        .values({
          chatSpeakingId: ctx.id,
          testPart,
          transcript: transcriptEntries,
        })
        .returning();
      transcript = created;
    }

    await database.insert(speakingEvaluation).values({
      transcriptId: transcript.id,
      fluencyCoherence,
      lexicalResource,
      grammaticalRange,
      pronunciation,
      overallBand,
      feedback,
      corrections,
      modelPhrases,
      improvedResponses,
    });

    ctx.creditsUsage.speakingEvaluatedCount++;
    ctx.onSpeakingUpdate();

    return {
      overallBand,
      fluencyCoherence,
      lexicalResource,
      grammaticalRange,
      pronunciation,
    };
  },
});

const getSpeakingResults = tool({
  description:
    "Fetch the latest speaking test results including the transcript, evaluation, and conversation history. Use this tool before evaluating to review what the student said.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const ctx = experimental_context as SpeakingToolContext;

    const transcripts = await database.query.speakingTranscript.findMany({
      where: (table, { eq }) => eq(table.chatSpeakingId, ctx.id),
      orderBy: (table, { asc }) => asc(table.createdAt),
      with: {
        evaluation: true,
        audioChunks: {
          orderBy: (table, { asc }) => asc(table.order),
        },
      },
    });

    // If no transcripts exist, extract conversation from chat messages
    if (transcripts.length === 0) {
      const chatData = await database.query.chat.findFirst({
        where: (table, { eq }) => eq(table.id, ctx.id),
        columns: { messages: true },
      });
      const allMessages = chatData?.messages ?? [];
      const filtered = allMessages.filter(
        (m) => m.role === "user" || m.role === "assistant",
      );
      const conversationEntries = extractTranscriptFromMessages(filtered);

      return {
        transcripts: [],
        chatConversation: conversationEntries,
      };
    }

    return {
      transcripts: transcripts.map((t) => ({
        testPart: t.testPart,
        transcript: t.transcript,
        duration: t.duration,
        cueCardTopic: t.cueCardTopic,
        hasAudio: t.audioChunks.length > 0,
        evaluation: t.evaluation
          ? {
              overallBand: t.evaluation.overallBand,
              fluencyCoherence: t.evaluation.fluencyCoherence,
              lexicalResource: t.evaluation.lexicalResource,
              grammaticalRange: t.evaluation.grammaticalRange,
              pronunciation: t.evaluation.pronunciation,
              feedback: t.evaluation.feedback,
              corrections: t.evaluation.corrections,
              modelPhrases: t.evaluation.modelPhrases,
              improvedResponses: t.evaluation.improvedResponses,
            }
          : null,
      })),
      chatConversation: null,
    };
  },
});

export const speakingTools = {
  "evaluate-speaking": evaluateSpeaking,
  "get-speaking-results": getSpeakingResults,
} satisfies ToolSet;

export type SpeakingTools = typeof speakingTools;
