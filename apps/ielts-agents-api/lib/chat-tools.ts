import type { ToolSet } from "ai";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ChatToolContext } from "#./lib/chat-tool-context.ts";

import { database } from "#./lib/database.ts";
import { chat } from "#./lib/schema/index.ts";

const suggestions = tool({
	description:
		"Display clickable suggestions for user's next actions. Call this at the end of your response after completing tasks.",
	inputSchema: z.object({
		suggestions: z
			.array(
				z.string().describe("A suggested prompt the user can click to send"),
			)
			.min(1)
			.max(5),
	}),
	execute: async ({ suggestions }, { experimental_context }) => {
		const { id } = experimental_context as ChatToolContext;
		const updated = await database
			.update(chat)
			.set({ suggestions })
			.where(eq(chat.id, id))
			.returning({ suggestions: chat.suggestions });
		if (updated.length === 0) throw new Error("Chat not found");
		return { suggestions: updated[0].suggestions };
	},
});

export const chatTools = {
	suggestions,
} satisfies ToolSet;

export type ChatTools = typeof chatTools;
