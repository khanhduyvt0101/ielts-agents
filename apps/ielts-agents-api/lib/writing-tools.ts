import type { ToolSet } from "ai";

import type { WritingToolContext } from "#./lib/writing-tool-context.ts";

import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { database } from "#./lib/database.ts";
import {
  writingEssay,
  writingEvaluation,
  writingTask,
} from "#./lib/schema/index.ts";

const generateTask = tool({
  description:
    "Generate an IELTS Academic Writing task at the target band difficulty level. This tool REPLACES any existing tasks and essays — always call it when generating a new writing task.",
  inputSchema: z.object({
    taskType: z
      .enum(["task-1", "task-2"])
      .describe("Task 1 (visual data description) or Task 2 (essay)"),
    prompt: z
      .string()
      .describe("The full writing task prompt/instructions for the student"),
    visualDescription: z
      .string()
      .optional()
      .describe(
        "Text description of the visual data for Task 1 — describes what the chart/graph/table shows. Not needed for Task 2.",
      ),
    chartData: z
      .object({
        type: z
          .enum(["bar", "line", "pie", "table"])
          .describe("The chart type to render"),
        title: z.string().describe("Chart title"),
        data: z
          .array(z.record(z.string(), z.union([z.string(), z.number()])))
          .describe(
            "Array of data points. Each object has the xKey field (category/label) plus one or more numeric value fields. Example for bar chart: [{ year: '2000', usa: 50, canada: 45 }, { year: '2010', usa: 70, canada: 75 }]",
          ),
        xKey: z
          .string()
          .describe(
            "The key in each data object used for the x-axis / category labels (e.g. 'year', 'country')",
          ),
        dataKeys: z
          .array(
            z.object({
              key: z.string().describe("The data field name (e.g. 'usa')"),
              label: z
                .string()
                .describe(
                  "Display label for the legend (e.g. 'United States')",
                ),
            }),
          )
          .describe("The data series to plot — each maps a key to a label"),
      })
      .optional()
      .describe(
        "Structured chart data for Task 1 — REQUIRED for Task 1 to render an actual chart. Generate realistic data matching the visual description. Not needed for Task 2.",
      ),
    requirements: z.object({
      wordCount: z
        .number()
        .describe("Minimum word count (150 for Task 1, 250 for Task 2)"),
      timeLimit: z
        .number()
        .describe("Time limit in minutes (20 for Task 1, 40 for Task 2)"),
    }),
    difficulty: z
      .string()
      .describe(
        "The numeric band score only, e.g. '6.5', '7.0'. Do NOT include the word 'Band'.",
      ),
  }),
  execute: async (
    {
      taskType,
      prompt,
      visualDescription,
      chartData,
      requirements,
      difficulty,
    },
    { experimental_context },
  ) => {
    const ctx = experimental_context as WritingToolContext;
    await database.transaction(async (tx) => {
      await tx
        .delete(writingEssay)
        .where(eq(writingEssay.chatWritingId, ctx.id));
      await tx.delete(writingTask).where(eq(writingTask.chatWritingId, ctx.id));
      await tx.insert(writingTask).values({
        chatWritingId: ctx.id,
        taskType,
        prompt,
        visualDescription: visualDescription ?? null,
        chartData: chartData ?? null,
        requirements,
        difficulty,
      });
    });
    ctx.creditsUsage.taskGeneratedCount++;
    ctx.onWritingUpdate();
    return { taskType, prompt, requirements, difficulty };
  },
});

const evaluateEssay = tool({
  description:
    "Evaluate a submitted IELTS essay against the 4 official IELTS band descriptors. Call this after the student submits their essay. Provide detailed scores, feedback, corrections, model phrases, and improved paragraphs.",
  inputSchema: z.object({
    taskAchievement: z
      .string()
      .describe("Band score for Task Achievement/Response (e.g. '7.0')"),
    coherenceCohesion: z
      .string()
      .describe("Band score for Coherence & Cohesion (e.g. '6.5')"),
    lexicalResource: z
      .string()
      .describe("Band score for Lexical Resource (e.g. '7.0')"),
    grammaticalRange: z
      .string()
      .describe("Band score for Grammatical Range & Accuracy (e.g. '6.5')"),
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
          original: z.string().describe("The original text from the essay"),
          corrected: z.string().describe("The corrected version"),
          explanation: z.string().describe("Why this correction is needed"),
          type: z
            .string()
            .describe(
              "Type of error (grammar, vocabulary, spelling, punctuation, etc.)",
            ),
        }),
      )
      .describe("Specific corrections for errors in the essay"),
    modelPhrases: z
      .array(z.string())
      .describe("Model phrases the student could use to improve their writing"),
    improvedParagraphs: z
      .array(
        z.object({
          original: z
            .string()
            .describe("The original paragraph from the essay"),
          improved: z.string().describe("The improved version"),
          explanation: z.string().describe("What was improved and why"),
        }),
      )
      .describe("Improved versions of weak paragraphs"),
  }),
  execute: async (
    {
      taskAchievement,
      coherenceCohesion,
      lexicalResource,
      grammaticalRange,
      overallBand,
      feedback,
      corrections,
      modelPhrases,
      improvedParagraphs,
    },
    { experimental_context },
  ) => {
    const ctx = experimental_context as WritingToolContext;

    const latestEssay = await database.query.writingEssay.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.chatWritingId, ctx.id), eq(table.submitted, true)),
      orderBy: (table, { desc }) => desc(table.createdAt),
    });

    if (!latestEssay) return { error: "No submitted essay found" };

    await database.insert(writingEvaluation).values({
      essayId: latestEssay.id,
      taskAchievement,
      coherenceCohesion,
      lexicalResource,
      grammaticalRange,
      overallBand,
      feedback,
      corrections,
      modelPhrases,
      improvedParagraphs,
    });

    ctx.creditsUsage.essayEvaluatedCount++;
    ctx.onWritingUpdate();

    return {
      overallBand,
      taskAchievement,
      coherenceCohesion,
      lexicalResource,
      grammaticalRange,
    };
  },
});

const getWritingResults = tool({
  description:
    "Fetch the latest writing test results including the task, submitted essay, and evaluation. Use this tool when you need to review the student's writing performance.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const ctx = experimental_context as WritingToolContext;

    const task = await database.query.writingTask.findFirst({
      where: (table, { eq }) => eq(table.chatWritingId, ctx.id),
    });

    const latestEssay = await database.query.writingEssay.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.chatWritingId, ctx.id), eq(table.submitted, true)),
      orderBy: (table, { desc }) => desc(table.createdAt),
      with: { evaluation: true },
    });

    return {
      task: task
        ? {
            taskType: task.taskType,
            prompt: task.prompt,
            visualDescription: task.visualDescription,
            requirements: task.requirements,
            difficulty: task.difficulty,
          }
        : null,
      essay: latestEssay
        ? {
            content: latestEssay.content,
            wordCount: latestEssay.wordCount,
            timeSpent: latestEssay.timeSpent,
          }
        : null,
      evaluation: latestEssay?.evaluation
        ? {
            overallBand: latestEssay.evaluation.overallBand,
            taskAchievement: latestEssay.evaluation.taskAchievement,
            coherenceCohesion: latestEssay.evaluation.coherenceCohesion,
            lexicalResource: latestEssay.evaluation.lexicalResource,
            grammaticalRange: latestEssay.evaluation.grammaticalRange,
            feedback: latestEssay.evaluation.feedback,
            corrections: latestEssay.evaluation.corrections,
            modelPhrases: latestEssay.evaluation.modelPhrases,
            improvedParagraphs: latestEssay.evaluation.improvedParagraphs,
          }
        : null,
    };
  },
});

export const writingTools = {
  "generate-task": generateTask,
  "evaluate-essay": evaluateEssay,
  "get-writing-results": getWritingResults,
} satisfies ToolSet;

export type WritingTools = typeof writingTools;
