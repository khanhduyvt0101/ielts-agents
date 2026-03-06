import type { ToolSet } from "ai";

import type { ReadingToolContext } from "#./lib/reading-tool-context.ts";

import { tool } from "ai";
import { z } from "zod";

const generatePassage = tool({
  description:
    "Generate an IELTS reading passage at the target band difficulty level. The passage should be 700-900 words on the given topic, written in an academic style appropriate for the IELTS exam.",
  inputSchema: z.object({
    title: z.string().describe("The title of the reading passage"),
    content: z
      .string()
      .describe("The full reading passage text (700-900 words)"),
    topic: z.string().describe("The topic/theme of the passage"),
    difficulty: z.string().describe("The target band score difficulty level"),
  }),
  execute: (
    { title, content, topic, difficulty },
    { experimental_context },
  ) => {
    const ctx = experimental_context as ReadingToolContext;
    ctx.creditsUsage.passageGeneratedCount++;
    ctx.onReadingUpdate();
    return { title, content, topic, difficulty };
  },
});

const generateQuestions = tool({
  description:
    "Generate IELTS-style comprehension questions for the reading passage. Include a mix of question types: True/False/Not Given, matching headings, fill-in-the-blank, and multiple choice.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          id: z.string().describe("Unique question identifier"),
          type: z
            .enum([
              "true-false-not-given",
              "multiple-choice",
              "fill-in-the-blank",
              "matching-headings",
            ])
            .describe("The type of IELTS question"),
          text: z.string().describe("The question text"),
          options: z
            .array(z.string())
            .optional()
            .describe("Options for multiple-choice or matching questions"),
          correctAnswer: z.string().describe("The correct answer"),
          explanation: z
            .string()
            .describe("Explanation of why this is the correct answer"),
        }),
      )
      .min(5)
      .max(14)
      .describe("Array of IELTS reading questions"),
  }),
  execute: ({ questions }, { experimental_context }) => {
    const ctx = experimental_context as ReadingToolContext;
    ctx.creditsUsage.questionsGeneratedCount++;
    ctx.onReadingUpdate();
    return { questions, count: questions.length };
  },
});

export const readingTools = {
  "generate-passage": generatePassage,
  "generate-questions": generateQuestions,
} satisfies ToolSet;

export type ReadingTools = typeof readingTools;
