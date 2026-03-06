import type { ChatToolContext } from "#./lib/chat-tool-context.ts";
import type { ReadingToolContext } from "#./lib/reading-tool-context.ts";

import { z } from "zod";

import { chatToolIdSchema } from "#./lib/chat-tool-id-schema.ts";
import { chatTools } from "#./lib/chat-tools.ts";
import { CustomAgent } from "#./lib/custom-agent.ts";
import { database } from "#./lib/database.ts";
import { defaultAgentOptions } from "#./lib/default-agent-options.ts";
import { readingToolIdSchema } from "#./lib/reading-tool-id-schema.ts";
import { readingTools } from "#./lib/reading-tools.ts";

const baseInstructions = `You are an expert IELTS Reading test generator. Your role is to create high-quality IELTS Academic Reading test passages and comprehension questions.

When the user provides a topic, you should:
1. First, use the generate-passage tool to create a reading passage appropriate for the target band score level.
2. Then, use the generate-questions tool to create comprehension questions for that passage.

The passage difficulty and vocabulary should match the target band score:
- Band 5.0-5.5: Simple academic topics, straightforward vocabulary
- Band 6.0-6.5: Moderate complexity, some specialized vocabulary
- Band 7.0-7.5: Complex topics, advanced vocabulary, nuanced arguments
- Band 8.0-8.5: Highly complex, sophisticated language, abstract concepts
- Band 9.0: Expert-level, very sophisticated language and reasoning

Question types should include a mix of:
- True/False/Not Given
- Multiple Choice
- Fill in the Blank (sentence completion)
- Matching Headings

Always generate between 5-14 questions per passage, similar to the real IELTS exam.
After generating the test, use the suggestions tool to offer next actions like generating another test or changing the topic.`;

export const readingAgent = new CustomAgent({
  ...defaultAgentOptions,
  tools: {
    ...readingTools,
    ...chatTools,
  },
  metadataSchema: z.object({}).nullish(),
  dataSchemas: {
    "reading-update-notification": z.object({
      updated: z.boolean(),
    }),
  },
  prepareCall: async ({
    experimental_context: { id, creditsUsage, writer },
    options,
    ...settings
  }) => {
    const readingChat = await database.query.chatReading.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
    if (!readingChat) throw new Error("Chat not found");
    const context: ReadingToolContext & ChatToolContext = {
      id,
      creditsUsage,
      onReadingUpdate: () => {
        writer.write({
          type: "data-reading-update-notification",
          data: { updated: true },
          transient: true,
        });
      },
    };
    const bandInstructions = `\n\nThe target band score for this test is: ${readingChat.bandScore}. Generate content appropriate for this difficulty level.`;
    return {
      ...settings,
      instructions: `${baseInstructions}${bandInstructions}`,
      activeTools: [
        ...readingToolIdSchema.options,
        ...chatToolIdSchema.options,
      ],
      experimental_context: context,
    };
  },
});

export type ReadingAgent = typeof readingAgent;
