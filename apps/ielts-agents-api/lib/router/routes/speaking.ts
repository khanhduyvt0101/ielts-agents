import { TRPCError } from "@trpc/server";
import { generateId } from "ai";
import { eq } from "drizzle-orm";
import { InsufficientCreditsError } from "ielts-agents-internal-util";
import { z } from "zod";
import { bandScoreSchema } from "#./lib/band-score-schema.ts";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { createAgentStream } from "#./lib/create-agent-stream.ts";
import { database } from "#./lib/database.ts";
import { insertChat } from "#./lib/insert-chat.ts";
import {
	chatSpeaking,
	speakingDefault,
	speakingTranscript,
} from "#./lib/schema/index.ts";
import type { AgentMessage } from "#./lib/types.ts";
import { workspaceProcedure } from "#./lib/workspace-procedure.ts";

const defaultSpeakingConfig = {
	bandScore: "6.5" as const,
	testPart: "full-test" as const,
};

export const createSpeaking = workspaceProcedure
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
		const agentDefault = await database.query.speakingDefault.findFirst({
			where: (table, { eq }) => eq(table.workspaceId, workspace.id),
		});
		const bandScore =
			agentDefault?.bandScore ?? defaultSpeakingConfig.bandScore;
		const testPart = agentDefault?.testPart ?? defaultSpeakingConfig.testPart;
		const message: AgentMessage["speaking"] = {
			id: generateId(),
			role: "user",
			parts: [{ type: "text", text: prompt }],
		};
		const chatId = await database.transaction(async (tx) => {
			const id = await insertChat({ workspaceId: workspace.id, message, tx });
			await tx.insert(chatSpeaking).values({ id, bandScore, testPart });
			return id;
		});
		await createAgentStream("speaking", chatId, [message], workspace.id);
		return { id: chatId };
	});

export const getSpeakingData = workspaceProcedure
	.input(z.object({ chatId: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { chatId } }) => {
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
			with: {
				speaking: {
					with: {
						transcripts: {
							with: {
								evaluation: true,
								audioChunks: {
									orderBy: (table, { asc }) => [asc(table.order)],
								},
							},
							orderBy: (table, { asc }) => [asc(table.createdAt)],
						},
					},
				},
			},
		});
		if (!chatData?.speaking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Speaking chat not found",
			});
		}
		return {
			bandScore: chatData.speaking.bandScore,
			testPart: chatData.speaking.testPart,
			transcripts: chatData.speaking.transcripts,
		};
	});

export const getSpeakingConfig = workspaceProcedure
	.input(z.object({ chatId: chatIdSchema }))
	.query(async ({ ctx: { workspace }, input: { chatId } }) => {
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
			with: { speaking: true },
		});
		if (!chatData?.speaking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Speaking chat not found",
			});
		}
		return {
			bandScore: chatData.speaking.bandScore,
			testPart: chatData.speaking.testPart,
		};
	});

export const getDefaultConfig = workspaceProcedure.query(async ({ ctx }) => {
	const defaultConfig = await database.query.speakingDefault.findFirst({
		where: eq(speakingDefault.workspaceId, ctx.workspace.id),
	});
	return {
		bandScore: defaultConfig?.bandScore ?? defaultSpeakingConfig.bandScore,
		testPart: defaultConfig?.testPart ?? defaultSpeakingConfig.testPart,
	};
});

export const updateConfig = workspaceProcedure
	.input(
		z.object({
			chatId: chatIdSchema.optional(),
			bandScore: bandScoreSchema.optional(),
			testPart: z.enum(["part-1", "part-2", "part-3", "full-test"]).optional(),
		}),
	)
	.mutation(
		async ({ ctx: { workspace }, input: { chatId, bandScore, testPart } }) => {
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
				if (testPart) updateValues.testPart = testPart;
				if (Object.keys(updateValues).length > 0) {
					await database
						.update(chatSpeaking)
						.set(updateValues)
						.where(eq(chatSpeaking.id, chatId));
				}
			} else {
				const updateValues: Record<string, unknown> = {};
				if (bandScore) updateValues.bandScore = bandScore;
				if (testPart) updateValues.testPart = testPart;
				await database
					.insert(speakingDefault)
					.values({
						workspaceId: workspace.id,
						bandScore: bandScore ?? defaultSpeakingConfig.bandScore,
						testPart: testPart ?? defaultSpeakingConfig.testPart,
					})
					.onConflictDoUpdate({
						target: speakingDefault.workspaceId,
						set: updateValues,
					});
			}
		},
	);

export const submitTranscript = workspaceProcedure
	.input(
		z.object({
			chatId: chatIdSchema,
			testPart: z.enum(["part-1", "part-2", "part-3"]),
			transcript: z
				.array(
					z.object({
						role: z.string(),
						text: z.string(),
						timestamp: z.number(),
					}),
				)
				.min(1),
			duration: z.number().int().nonnegative().optional(),
			cueCardTopic: z.string().optional(),
		}),
	)
	.mutation(
		async ({
			ctx: { workspace },
			input: { chatId, testPart, transcript, duration, cueCardTopic },
		}) => {
			const chatData = await database.query.chat.findFirst({
				where: (table, { and, eq }) =>
					and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
				with: { speaking: true },
			});
			if (!chatData?.speaking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Speaking chat not found",
				});
			}
			const [result] = await database
				.insert(speakingTranscript)
				.values({
					chatSpeakingId: chatId,
					testPart,
					transcript,
					duration: duration ?? null,
					cueCardTopic: cueCardTopic ?? null,
				})
				.returning();
			return { transcriptId: result.id };
		},
	);
