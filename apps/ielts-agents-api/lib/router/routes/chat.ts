import { TRPCError } from "@trpc/server";
import { generateText, Output } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { AgentId } from "#./lib/agent-id.ts";

import { agentIdSchema } from "#./lib/agent-id-schema.ts";
import { aiRegistry } from "#./lib/ai-registry.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { database } from "#./lib/database.ts";
import { chat } from "#./lib/schema/index.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

export const getAgentConfig = workspaceProcedure
	.input(z.object({ chatId: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { chatId } }) => {
		const withColumns = { columns: { bandScore: true } } as const;
		const withRelations = Object.fromEntries(
			agentIdSchema.options.map((agentName) => [agentName, withColumns]),
		) as Record<AgentId, typeof withColumns>;
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
			with: withRelations,
		});
		if (!chatData)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		for (const agentName of agentIdSchema.options) {
			const config = chatData[agentName];
			if (config) return config;
		}
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Agent config doesn't exist",
		});
	});

const deleteProcedure = workspaceProcedure
	.input(z.object({ id: chatIdSchema }))
	.mutation(async ({ ctx: { workspace }, input: { id } }) => {
		const deletedChats = await database
			.delete(chat)
			.where(and(eq(chat.workspaceId, workspace.id), eq(chat.id, id)))
			.returning({ id: chat.id });
		if (deletedChats.length === 0)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		return deletedChats[0];
	});

const getProcedure = workspaceProcedure
	.input(z.object({ id: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { id } }) => {
		const withColumns = { columns: { id: true } } as const;
		const withRelations = Object.fromEntries(
			agentIdSchema.options.map((agentName) => [agentName, withColumns]),
		) as Record<AgentId, typeof withColumns>;
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, id)),
			columns: {
				id: true,
				messages: true,
			},
			with: withRelations,
		});
		if (!chatData)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		return chatData;
	});

const listProcedure = workspaceProcedure.query(
	async ({ ctx: { workspace } }) => {
		const chats = await database.query.chat.findMany({
			where: (table, { eq }) => eq(table.workspaceId, workspace.id),
			columns: { id: true, name: true, emoji: true },
			orderBy: (table, { desc }) => [desc(table.updatedAt)],
		});
		return chats;
	},
);

export const getSuggestions = workspaceProcedure
	.input(z.object({ id: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { id } }) => {
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, id)),
			columns: { suggestions: true },
		});
		if (!chatData)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		return chatData.suggestions;
	});

export const updateChatName = workspaceProcedure
	.input(z.object({ id: chatIdSchema }))
	.mutation(async ({ ctx: { workspace }, input: { id } }) => {
		const chatData = await database.query.chat.findFirst({
			columns: { name: true, emoji: true, messages: true },
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, id)),
		});
		if (!chatData)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		if (chatData.name !== "" && chatData.emoji !== "") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Chat already has a name and emoji",
			});
		}
		const text = chatData.messages
			.map((message) =>
				message.parts
					.filter((part) => part.type === "text")
					.map((part) => part.text)
					.join("\n"),
			)
			.join("\n");
		const { output } = await generateText({
			model: aiRegistry.languageModel("openai:gpt-5-mini"),
			output: Output.object({
				schema: z.object({
					name: z.string().describe("A concise title (2-5 words)"),
					emoji: z.string().describe("A single relevant emoji"),
				}),
			}),
			prompt: `
Generate a title (2-5 words) and a single emoji for an AI chat that starts with the following prompt:

${text}
`.trim(),
		});
		const updatedChatData = await database
			.update(chat)
			.set({ name: output.name, emoji: output.emoji })
			.where(and(eq(chat.id, id), eq(chat.workspaceId, workspace.id)))
			.returning({
				name: chat.name,
				emoji: chat.emoji,
			});
		if (updatedChatData.length === 0) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update chat",
			});
		}
		return updatedChatData[0];
	});

export const getChatConfig = workspaceProcedure
	.input(z.object({ id: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { id } }) => {
		const chatData = await database.query.chat.findFirst({
			columns: { name: true, emoji: true },
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, id)),
		});
		if (!chatData)
			throw new TRPCError({ code: "NOT_FOUND", message: "Chat doesn't exist" });
		return chatData;
	});

export {
	deleteProcedure as delete,
	getProcedure as get,
	listProcedure as list,
};
