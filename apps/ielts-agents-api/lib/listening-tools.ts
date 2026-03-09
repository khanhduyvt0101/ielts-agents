import type { ToolSet } from "ai";

import type { ListeningToolContext } from "#./lib/listening-tool-context.ts";

import { openai } from "@ai-sdk/openai";
import { experimental_generateSpeech as generateSpeech, tool } from "ai";
import { eq } from "drizzle-orm";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { database } from "#./lib/database.ts";
import {
  listeningQuestion,
  listeningScript,
  listeningSession,
} from "#./lib/schema/index.ts";

const AUDIO_BASE_DIR = path.join(process.cwd(), "data", "audio");

const generateScript = tool({
  description:
    "Generate transcript/script for all 4 IELTS listening test sections. Each section should have a realistic script with speaker labels. This tool REPLACES any existing scripts, sessions, answers, and questions — always call it FIRST when generating a new test.",
  inputSchema: z.object({
    sections: z
      .array(
        z.object({
          sectionNumber: z
            .number()
            .int()
            .min(1)
            .max(4)
            .describe("Section number (1-4)"),
          sectionType: z
            .enum(["conversation", "monologue", "discussion", "lecture"])
            .describe("Type of section"),
          title: z
            .string()
            .describe(
              "Title of the section (e.g., 'Library Membership Inquiry')",
            ),
          script: z
            .string()
            .describe(
              "Full transcript text with speaker labels (e.g., 'Speaker A: ...'). Should be realistic IELTS listening content.",
            ),
        }),
      )
      .min(4)
      .max(4)
      .describe("Array of 4 section scripts"),
  }),
  execute: async ({ sections }, { experimental_context }) => {
    const ctx = experimental_context as ListeningToolContext;

    // Clean up old data
    await database
      .delete(listeningSession)
      .where(eq(listeningSession.chatListeningId, ctx.id));
    await database
      .delete(listeningQuestion)
      .where(eq(listeningQuestion.chatListeningId, ctx.id));
    await database
      .delete(listeningScript)
      .where(eq(listeningScript.chatListeningId, ctx.id));

    // Clean up old audio files
    const audioDir = path.join(AUDIO_BASE_DIR, String(ctx.id));
    if (existsSync(audioDir))
      await rm(audioDir, { recursive: true, force: true });

    await database.insert(listeningScript).values(
      sections.map((s) => ({
        chatListeningId: ctx.id,
        sectionNumber: s.sectionNumber,
        sectionType: s.sectionType,
        title: s.title,
        script: s.script,
      })),
    );
    ctx.creditsUsage.scriptGeneratedCount++;
    ctx.onListeningUpdate();
    return {
      sections: sections.map((s) => ({
        sectionNumber: s.sectionNumber,
        title: s.title,
        sectionType: s.sectionType,
      })),
    };
  },
});

interface SpeakerVoiceConfig {
  voice: string;
  instructions: string;
}

const VOICE_POOL: SpeakerVoiceConfig[] = [
  {
    voice: "alloy",
    instructions:
      "Speak as a friendly young professional in a natural, conversational tone.",
  },
  {
    voice: "nova",
    instructions:
      "Speak as a warm, clear-voiced woman with a calm and helpful manner.",
  },
  {
    voice: "echo",
    instructions:
      "Speak as a confident middle-aged man with a steady, measured pace.",
  },
  {
    voice: "shimmer",
    instructions:
      "Speak as an enthusiastic young student with an energetic tone.",
  },
  {
    voice: "fable",
    instructions:
      "Speak as a composed British narrator with a formal, articulate delivery.",
  },
  {
    voice: "onyx",
    instructions:
      "Speak as a deep-voiced academic with an authoritative, professorial manner.",
  },
];

const NARRATOR_CONFIG: SpeakerVoiceConfig = {
  voice: "fable",
  instructions:
    "Speak as a calm, neutral narrator reading stage directions clearly.",
};

interface ScriptSegment {
  speaker: string;
  text: string;
}

const SPEAKER_LABEL_PATTERN =
  /^(Speaker [A-Z]\d?|Student [A-Z]\d?|Professor|Narrator|Receptionist|Tour Guide|Lecturer|Interviewer|Manager|Librarian|Doctor|Host|Guide|Tutor|Customer|Agent|Advisor|Officer):\s*/gm;

function parseScriptSegments(script: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  const matches: { index: number; speaker: string; labelLength: number }[] = [];

  // Reset lastIndex — the regex is module-level with /g flag
  SPEAKER_LABEL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SPEAKER_LABEL_PATTERN.exec(script)) !== null) {
    matches.push({
      index: match.index,
      speaker: match[1],
      labelLength: match[0].length,
    });
  }

  // No labels found — return whole script as single segment
  if (matches.length === 0) {
    const trimmed = script.trim();
    return trimmed ? [{ speaker: "", text: trimmed }] : [];
  }

  // Text before the first label is narration
  const preamble = script.slice(0, matches[0].index).trim();
  if (preamble) segments.push({ speaker: "", text: preamble });

  for (let i = 0; i < matches.length; i++) {
    const textStart = matches[i].index + matches[i].labelLength;
    const textEnd =
      i + 1 < matches.length ? matches[i + 1].index : script.length;
    const text = script.slice(textStart, textEnd).trim();
    if (!text) continue;

    // Merge consecutive segments from the same speaker
    const last = segments.at(-1);
    if (last?.speaker === matches[i].speaker) last.text += "\n" + text;
    else segments.push({ speaker: matches[i].speaker, text });
  }

  return segments;
}

function assignVoices(
  segments: ScriptSegment[],
): Map<string, SpeakerVoiceConfig> {
  const voiceMap = new Map<string, SpeakerVoiceConfig>();
  let poolIndex = 0;

  for (const seg of segments) {
    if (voiceMap.has(seg.speaker)) continue;
    if (seg.speaker === "") {
      voiceMap.set("", NARRATOR_CONFIG);
    } else {
      voiceMap.set(seg.speaker, VOICE_POOL[poolIndex % VOICE_POOL.length]);
      poolIndex++;
    }
  }

  return voiceMap;
}

const TTS_CHAR_LIMIT = 4096;

async function generateSegmentAudio(
  text: string,
  config: SpeakerVoiceConfig,
): Promise<Buffer> {
  if (text.length <= TTS_CHAR_LIMIT) {
    const { audio } = await generateSpeech({
      model: openai.speech("gpt-4o-mini-tts"),
      text,
      voice: config.voice,
      instructions: config.instructions,
    });
    return Buffer.from(audio.uint8Array);
  }

  const chunks = splitIntoChunks(text, TTS_CHAR_LIMIT);
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const { audio } = await generateSpeech({
      model: openai.speech("gpt-4o-mini-tts"),
      text: chunk,
      voice: config.voice,
      instructions: config.instructions,
    });
    buffers.push(Buffer.from(audio.uint8Array));
  }
  return Buffer.concat(buffers);
}

const generateAudio = tool({
  description:
    "Generate TTS audio from a listening script for a specific section. Call this AFTER generate-script, once per section.",
  inputSchema: z.object({
    sectionNumber: z
      .number()
      .int()
      .min(1)
      .max(4)
      .describe("Which section to generate audio for"),
  }),
  execute: async ({ sectionNumber }, { experimental_context }) => {
    const ctx = experimental_context as ListeningToolContext;

    const script = await database.query.listeningScript.findFirst({
      where: (table, { and, eq: eqOp }) =>
        and(
          eqOp(table.chatListeningId, ctx.id),
          eqOp(table.sectionNumber, sectionNumber),
        ),
    });

    if (!script)
      return { error: `No script found for section ${sectionNumber}` };

    const audioDir = path.join(AUDIO_BASE_DIR, String(ctx.id));
    await mkdir(audioDir, { recursive: true });
    const audioPath = path.join(audioDir, `section-${sectionNumber}.mp3`);

    const scriptText = script.script;
    const segments = parseScriptSegments(scriptText);

    if (segments.length === 0)
      return { error: `Script for section ${sectionNumber} is empty` };

    const voiceMap = assignVoices(segments);

    const buffers: Buffer[] = [];
    for (const segment of segments) {
      if (!segment.text) continue;
      const config = voiceMap.get(segment.speaker) ?? VOICE_POOL[0];
      const buf = await generateSegmentAudio(segment.text, config);
      buffers.push(buf);
    }
    await writeFile(audioPath, Buffer.concat(buffers));

    const audioUrl = `/audio/${ctx.id}/section-${sectionNumber}.mp3`;

    // Estimate duration (~150 words per minute for TTS)
    const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    await database
      .update(listeningScript)
      .set({ audioUrl, duration: estimatedDuration })
      .where(eq(listeningScript.id, script.id));

    ctx.creditsUsage.audioGeneratedCount++;
    ctx.onListeningUpdate();
    return {
      sectionNumber,
      audioUrl,
      duration: estimatedDuration,
    };
  },
});

function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(". ", maxLength);
    if (splitAt === -1 || splitAt < maxLength / 2)
      splitAt = remaining.lastIndexOf(" ", maxLength);
    if (splitAt === -1) splitAt = maxLength;
    else splitAt += 1; // Include the space/period
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

const generateQuestions = tool({
  description:
    "Generate IELTS listening comprehension questions for all 4 sections (10 questions per section, 40 total). This tool REPLACES any existing questions — call it AFTER generate-script and generate-audio.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          id: z.string().describe("Unique question identifier"),
          sectionNumber: z
            .number()
            .int()
            .min(1)
            .max(4)
            .describe("Which section this question belongs to"),
          type: z
            .enum([
              "multiple-choice",
              "matching",
              "plan-map-diagram",
              "form-completion",
              "note-completion",
              "table-completion",
              "flow-chart-completion",
              "summary-completion",
              "sentence-completion",
              "short-answer",
            ])
            .describe("The type of IELTS listening question"),
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
      .min(40)
      .max(40)
      .describe(
        "Array of IELTS listening questions (10 per section, 40 total)",
      ),
  }),
  execute: async ({ questions }, { experimental_context }) => {
    const ctx = experimental_context as ListeningToolContext;
    await database
      .delete(listeningQuestion)
      .where(eq(listeningQuestion.chatListeningId, ctx.id));
    await database.insert(listeningQuestion).values(
      questions.map((q, idx) => ({
        chatListeningId: ctx.id,
        sectionNumber: q.sectionNumber,
        questionNumber: idx + 1,
        type: q.type,
        questionText: q.text,
        options: q.options ?? [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    );
    ctx.creditsUsage.questionsGeneratedCount++;
    ctx.onListeningUpdate();
    return { questions, count: questions.length };
  },
});

const getListeningResults = tool({
  description:
    "Fetch the latest listening test results including scripts, questions, session score, and user answers. Use this tool when the user mentions submitting their test or when you need to review their performance.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const ctx = experimental_context as ListeningToolContext;

    const scripts = await database.query.listeningScript.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.chatListeningId, ctx.id),
      columns: { sectionNumber: true, title: true },
      orderBy: (table, { asc }) => asc(table.sectionNumber),
    });

    const questions = await database.query.listeningQuestion.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.chatListeningId, ctx.id),
      columns: {
        id: true,
        sectionNumber: true,
        questionNumber: true,
        type: true,
        questionText: true,
        correctAnswer: true,
      },
      orderBy: (table, { asc }) => asc(table.questionNumber),
    });

    const latestSession = await database.query.listeningSession.findFirst({
      where: (table, { eq: eqOp, and }) =>
        and(eqOp(table.chatListeningId, ctx.id), eqOp(table.submitted, true)),
      orderBy: (table, { desc }) => desc(table.createdAt),
      columns: {
        id: true,
        score: true,
        totalQuestions: true,
        timeSpent: true,
      },
    });

    if (!latestSession) return { error: "No submitted session found" };

    const answers = await database.query.listeningAnswer.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.sessionId, latestSession.id),
      columns: { questionId: true, userAnswer: true },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a.userAnswer]));

    const questionResults = questions.map((q) => {
      const userAnswer = answerMap.get(q.id) ?? "";
      const isCorrect =
        userAnswer.trim().toLowerCase() ===
        q.correctAnswer.trim().toLowerCase();
      return {
        sectionNumber: q.sectionNumber,
        questionNumber: q.questionNumber,
        type: q.type,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswer || "(no answer)",
        isCorrect,
      };
    });

    return {
      sections: scripts,
      score: latestSession.score,
      totalQuestions: latestSession.totalQuestions,
      timeSpent: latestSession.timeSpent,
      questions: questionResults,
    };
  },
});

export const listeningTools = {
  "generate-script": generateScript,
  "generate-audio": generateAudio,
  "generate-listening-questions": generateQuestions,
  "get-listening-results": getListeningResults,
} satisfies ToolSet;

export type ListeningTools = typeof listeningTools;
