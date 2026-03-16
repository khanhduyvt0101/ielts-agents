import { TRPCError } from "@trpc/server";
import { database } from "#./lib/database.ts";
import type { IeltsAgentsMessage } from "#./lib/ielts-agents-message.ts";
import { chat } from "#./lib/schema/index.ts";

type Tx = Parameters<Parameters<typeof database.transaction>[0]>[0];

interface InsertChatProps {
	workspaceId: number;
	message: IeltsAgentsMessage;
	tx?: Tx;
}

export async function insertChat({
	workspaceId,
	message,
	tx,
}: InsertChatProps) {
	const insertResults = await (tx ?? database)
		.insert(chat)
		.values({
			workspaceId,
			name: "",
			emoji: "",
			messages: [message],
		})
		.returning({ id: chat.id });
	if (insertResults.length !== 1) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create chat",
		});
	}
	return insertResults[0].id;
}
