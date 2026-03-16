import type { LanguageModelUsage } from "ai";
import {
	APICallError,
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	generateId,
	validateUIMessages,
} from "ai";
import { eq, sql } from "drizzle-orm";
import {
	CONTEXT_WINDOW_EXCEEDED_MESSAGE,
	captureError,
	getErrorMessage,
	isContextWindowExceededMessage,
} from "ielts-agents-internal-util";
import type { AgentId } from "#./lib/agent-id.ts";
import { agents } from "#./lib/agents.ts";
import { cleanMessages } from "#./lib/clean-messages.ts";
import {
	calculateTotalCredits,
	createCreditsUsage,
} from "#./lib/credits-usage.ts";
import { database } from "#./lib/database.ts";
import type { IeltsAgentsMessage } from "#./lib/ielts-agents-message.ts";
import { languageModelUsageToCredits } from "#./lib/language-model-usage-to-credits.ts";
import { resumableStreamContext } from "#./lib/resumable-stream-context.ts";
import { chat, workspace } from "#./lib/schema/index.ts";

export async function createAgentStream(
	agentId: AgentId,
	id: number,
	messages: unknown[],
	workspaceId: number,
): Promise<Response> {
	const agent = agents[agentId];
	const validatedMessages = await validateUIMessages<IeltsAgentsMessage>({
		messages,
		tools: agent.tools,
		metadataSchema: agent.metadataSchema,
		dataSchemas: agent.dataSchemas,
	});
	const creditsUsage = createCreditsUsage();
	return new Promise<Response>((resolve, reject) => {
		let settled = false;
		const onError = (error: unknown) => {
			void database
				.update(chat)
				.set({ streamId: "" })
				.where(eq(chat.id, id))
				.catch(captureError);
			resolveUsage();
			if (
				APICallError.isInstance(error) &&
				error.statusCode === 400 &&
				isContextWindowExceededMessage(error.message)
			) {
				if (!settled) {
					settled = true;
					reject(error);
				}
				return CONTEXT_WINDOW_EXCEEDED_MESSAGE;
			}
			if (settled) {
				captureError(error);
			} else {
				settled = true;
				reject(error);
			}
			return getErrorMessage(error);
		};
		const onSuccess = (response: Response) => {
			if (settled) return;
			settled = true;
			resolve(response);
		};
		let resolveUsage: (usage?: LanguageModelUsage) => void;
		const usagePromise = new Promise<LanguageModelUsage | undefined>(
			(resolve) => {
				resolveUsage = resolve;
			},
		);
		let finished = false;
		const onFinish = async (
			_response: Response,
			messages: IeltsAgentsMessage[],
		) => {
			if (finished) return;
			finished = true;
			const cleanedMessages = cleanMessages(messages);
			const usage = await Promise.race([
				usagePromise,
				new Promise<void>((resolve) => {
					setTimeout(resolve, 60_000);
				}),
			]);
			if (!usage) {
				const toolCredits = Math.ceil(calculateTotalCredits(creditsUsage));
				await (toolCredits > 0
					? database.transaction(async (tx) => {
							await tx
								.update(chat)
								.set({
									usedCredits: sql`${chat.usedCredits} + ${toolCredits}`,
									streamId: "",
									messages: cleanedMessages,
								})
								.where(eq(chat.id, id));
							await tx
								.update(workspace)
								.set({
									usedCredits: sql`LEAST(${workspace.usedCredits} + ${toolCredits}, ${workspace.aggregatedCredits})`,
								})
								.where(eq(workspace.id, workspaceId));
						})
					: database
							.update(chat)
							.set({ streamId: "", messages: cleanedMessages })
							.where(eq(chat.id, id)));
				return;
			}
			const totalUsage = Math.max(
				1,
				Math.ceil(
					calculateTotalCredits(creditsUsage) +
						languageModelUsageToCredits(usage, "openai:gpt-5.2-chat-latest"),
				),
			);
			await Promise.all([
				database
					.update(chat)
					.set({
						usedCredits: sql`${chat.usedCredits} + ${totalUsage}`,
						streamId: "",
						messages: cleanedMessages,
					})
					.where(eq(chat.id, id)),
				database
					.update(workspace)
					.set({
						usedCredits: sql`LEAST(${workspace.usedCredits} + ${totalUsage}, ${workspace.aggregatedCredits})`,
					})
					.where(eq(workspace.id, workspaceId)),
			]);
		};
		const response = createUIMessageStreamResponse({
			stream: createUIMessageStream({
				originalMessages: validatedMessages,
				onError,
				onFinish: ({ messages }) => onFinish(response, messages),
				execute: async ({ writer }) => {
					const context: typeof agent.context = { id, creditsUsage, writer };
					const stream = await agent.stream({
						messages: await convertToModelMessages(
							cleanMessages(validatedMessages),
						),
						// @ts-expect-error AI SDK needs to support custom context
						experimental_context: context,
					});
					writer.merge(
						stream.toUIMessageStream({
							originalMessages: validatedMessages,
							onError,
							generateMessageId: generateId,
						}),
					);
					await stream.consumeStream({ onError });
					resolveUsage(await stream.totalUsage);
				},
			}),
			consumeSseStream: async ({ stream }) => {
				const streamId = generateId();
				await Promise.all([
					resumableStreamContext.createNewResumableStream(
						streamId,
						() => stream,
					),
					database.update(chat).set({ streamId }).where(eq(chat.id, id)),
				]);
				onSuccess(response);
			},
		});
	});
}
