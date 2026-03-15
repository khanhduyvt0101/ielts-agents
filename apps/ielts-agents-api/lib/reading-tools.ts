import type { ToolSet } from "ai";

import type { ReadingToolContext } from "#./lib/reading-tool-context.ts";

import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { database } from "#./lib/database.ts";
import {
  readingPassage,
  readingQuestion,
  readingSession,
  savedVocabulary,
} from "#./lib/schema/index.ts";

const generatePassage = tool({
  description:
    "Generate an IELTS reading passage at the target band difficulty level. The passage should be 700-900 words on the given topic, written in an academic style appropriate for the IELTS exam. This tool REPLACES any existing passage, sessions, and answers — always call it FIRST when generating a new test.",
  inputSchema: z.object({
    title: z.string().describe("The title of the reading passage"),
    content: z
      .string()
      .describe("The full reading passage text (700-900 words)"),
    topic: z.string().describe("The topic/theme of the passage"),
    difficulty: z.string().describe("The target band score difficulty level"),
  }),
  execute: async (
    { title, content, topic, difficulty },
    { experimental_context },
  ) => {
    const ctx = experimental_context as ReadingToolContext;
    await database
      .delete(readingSession)
      .where(eq(readingSession.chatReadingId, ctx.id));
    await database
      .delete(readingPassage)
      .where(eq(readingPassage.chatReadingId, ctx.id));
    await database
      .insert(readingPassage)
      .values({ chatReadingId: ctx.id, title, content, topic, difficulty });
    ctx.creditsUsage.passageGeneratedCount++;
    ctx.onReadingUpdate();
    return { title, content, topic, difficulty };
  },
});

const generateQuestions = tool({
  description:
    "Generate IELTS-style comprehension questions for the reading passage. Include a mix of question types: True/False/Not Given, Yes/No/Not Given, matching headings, fill-in-the-blank, multiple choice, sentence completion, summary completion, and table completion. Include passageQuote, distractors, and paraphrase for each question to enable post-test analysis. This tool REPLACES any existing questions — call it AFTER generate-passage.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          id: z.string().describe("Unique question identifier"),
          type: z
            .enum([
              "true-false-not-given",
              "yes-no-not-given",
              "multiple-choice",
              "fill-in-the-blank",
              "matching-headings",
              "sentence-completion",
              "summary-completion",
              "table-completion",
            ])
            .describe("The type of IELTS question"),
          text: z
            .string()
            .describe(
              "The actual testable question or statement — NOT a generic instruction. For fill-in-the-blank/sentence-completion, MUST include ____ as the blank placeholder within the sentence.",
            ),
          options: z
            .array(z.string())
            .optional()
            .describe(
              "Options for multiple-choice, matching, or summary completion (word bank) questions",
            ),
          correctAnswer: z.string().describe("The correct answer"),
          explanation: z
            .string()
            .describe(
              "A detailed step-by-step explanation. Step 1: Read the passage — quote key sentences, bold important words. Step 2: Compare meaning — map the question to the passage, explain why the answer is correct. End with the final answer.",
            ),
          passageQuote: z
            .string()
            .optional()
            .describe(
              "The exact quote from the passage where the answer can be found",
            ),
          distractors: z
            .array(
              z.object({
                text: z
                  .string()
                  .describe("The distractor text from the passage"),
                explanation: z
                  .string()
                  .describe(
                    "Why this is a distractor and not the correct answer",
                  ),
              }),
            )
            .optional()
            .describe(
              "Distractors: wrong answers from the passage that could mislead readers",
            ),
          paraphrase: z
            .object({
              questionPhrase: z
                .string()
                .describe("The phrase used in the question"),
              passagePhrase: z
                .string()
                .describe("The equivalent phrase used in the passage"),
            })
            .optional()
            .describe(
              "Paraphrase mapping between question wording and passage wording",
            ),
          tableData: z
            .object({
              title: z.string().describe("Title of the table"),
              columnHeaders: z
                .array(z.string())
                .describe("Column header labels"),
              rows: z
                .array(
                  z.object({
                    header: z.string().describe("Row header label"),
                    cells: z
                      .array(z.string())
                      .describe(
                        "Cell values. Use {{Q<number>}} markers for blanks where <number> matches the question's sequential questionNumber (e.g., {{Q8}}, {{Q9}}). NEVER use letter suffixes like {{Q8a}}.",
                      ),
                  }),
                )
                .describe("Table rows"),
            })
            .optional()
            .describe(
              "Table data for table-completion questions. Each blank is a SEPARATE question with its own questionNumber. Use {{Q<number>}} markers in cells (e.g., {{Q8}}, {{Q9}}, {{Q10}}). Put the same tableData on all questions in the table group.",
            ),
        }),
      )
      .min(5)
      .max(14)
      .describe("Array of IELTS reading questions"),
  }),
  execute: async ({ questions }, { experimental_context }) => {
    const ctx = experimental_context as ReadingToolContext;
    await database
      .delete(readingQuestion)
      .where(eq(readingQuestion.chatReadingId, ctx.id));
    await database.insert(readingQuestion).values(
      questions.map((q, idx) => ({
        chatReadingId: ctx.id,
        questionNumber: idx + 1,
        type: q.type,
        questionText: q.text,
        options: q.options ?? [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        passageQuote: q.passageQuote ?? null,
        distractors: q.distractors ?? [],
        paraphrase: q.paraphrase ?? null,
        tableData: q.tableData ?? null,
      })),
    );
    ctx.creditsUsage.questionsGeneratedCount++;
    ctx.onReadingUpdate();
    return { questions, count: questions.length };
  },
});

const extractVocabulary = tool({
  description:
    "Extract key IELTS vocabulary words from the reading passage. Include definitions, example usage, and IELTS relevance for each word. This tool REPLACES any existing vocabulary — call it AFTER generate-questions.",
  inputSchema: z.object({
    words: z
      .array(
        z.object({
          word: z.string().describe("The vocabulary word or phrase"),
          definition: z
            .string()
            .describe("Clear definition of the word in context"),
          exampleUsage: z
            .string()
            .describe("An example sentence using the word"),
          ieltsRelevance: z
            .string()
            .describe(
              "Why this word is important for IELTS (e.g., common in academic texts, frequently tested)",
            ),
        }),
      )
      .min(5)
      .max(15)
      .describe("Array of vocabulary words extracted from the passage"),
  }),
  execute: async ({ words }, { experimental_context }) => {
    const ctx = experimental_context as ReadingToolContext;
    await database
      .delete(savedVocabulary)
      .where(eq(savedVocabulary.chatReadingId, ctx.id));
    await database.insert(savedVocabulary).values(
      words.map((w) => ({
        chatReadingId: ctx.id,
        word: w.word,
        definition: w.definition,
        exampleUsage: w.exampleUsage,
        ieltsRelevance: w.ieltsRelevance,
      })),
    );
    ctx.onReadingUpdate();
    return { words, count: words.length };
  },
});

const getReadingResults = tool({
  description:
    "Fetch the latest reading test results including passage, questions, session score, and user answers. Use this tool when the user mentions submitting their test or when you need to review their performance.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const ctx = experimental_context as ReadingToolContext;

    const passage = await database.query.readingPassage.findFirst({
      where: (table, { eq }) => eq(table.chatReadingId, ctx.id),
      columns: { title: true, content: true },
    });

    const questions = await database.query.readingQuestion.findMany({
      where: (table, { eq }) => eq(table.chatReadingId, ctx.id),
      columns: {
        id: true,
        questionNumber: true,
        type: true,
        questionText: true,
        correctAnswer: true,
        explanation: true,
        passageQuote: true,
        distractors: true,
        paraphrase: true,
      },
      orderBy: (table, { asc }) => asc(table.questionNumber),
    });

    const latestSession = await database.query.readingSession.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.chatReadingId, ctx.id), eq(table.submitted, true)),
      orderBy: (table, { desc }) => desc(table.createdAt),
      columns: {
        id: true,
        score: true,
        totalQuestions: true,
        timeSpent: true,
      },
    });

    if (!latestSession) return { error: "No submitted session found" };

    const answers = await database.query.readingAnswer.findMany({
      where: (table, { eq }) => eq(table.sessionId, latestSession.id),
      columns: { questionId: true, userAnswer: true },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a.userAnswer]));

    const questionResults = questions.map((q) => {
      const userAnswer = answerMap.get(q.id) ?? "";
      const isCorrect =
        userAnswer.trim().toLowerCase() ===
        q.correctAnswer.trim().toLowerCase();
      return {
        questionNumber: q.questionNumber,
        type: q.type,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswer || "(no answer)",
        isCorrect,
        explanation: q.explanation,
        passageQuote: q.passageQuote,
        distractors: q.distractors,
        paraphrase: q.paraphrase,
      };
    });

    return {
      passageTitle: passage?.title ?? "Unknown",
      passageContent: passage?.content ?? "",
      score: latestSession.score,
      totalQuestions: latestSession.totalQuestions,
      timeSpent: latestSession.timeSpent,
      questions: questionResults,
    };
  },
});

export const readingTools = {
  "generate-passage": generatePassage,
  "generate-questions": generateQuestions,
  "extract-vocabulary": extractVocabulary,
  "get-reading-results": getReadingResults,
} satisfies ToolSet;

export type ReadingTools = typeof readingTools;
