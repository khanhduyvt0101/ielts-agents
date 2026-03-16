import type { IeltsAgentsMessage } from "#./lib/ielts-agents-message.ts";
import type { IeltsAgentsMessagePart } from "#./lib/ielts-agents-message-part.ts";

function getPartItemId(part: IeltsAgentsMessagePart): string | undefined {
	if (part.type === "reasoning" || part.type === "text") {
		return (part.providerMetadata?.openai as { itemId?: string } | undefined)
			?.itemId;
	}
	if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
		return (
			(part as { callProviderMetadata?: Record<string, unknown> })
				.callProviderMetadata?.openai as { itemId?: string } | undefined
		)?.itemId;
	}
	return undefined;
}

function deduplicateMessagesByIdField(messages: IeltsAgentsMessage[]) {
	const lastIndexById = new Map<string, number>();
	for (const [i, msg] of messages.entries())
		if (msg.id) lastIndexById.set(msg.id, i);
	if (lastIndexById.size === messages.length) return messages;
	return messages.filter((msg, index) => {
		if (!msg.id) return true;
		return lastIndexById.get(msg.id) === index;
	});
}

function deduplicateProviderItemIds(messages: IeltsAgentsMessage[]) {
	const lastOccurrence = new Map<string, { msgIdx: number; partIdx: number }>();
	for (const [msgIdx, msg] of messages.entries()) {
		if (msg.role !== "assistant") continue;
		for (const [partIdx, part] of msg.parts.entries()) {
			const itemId = getPartItemId(part);
			if (itemId) lastOccurrence.set(itemId, { msgIdx, partIdx });
		}
	}
	if (lastOccurrence.size === 0) return messages;
	const result: IeltsAgentsMessage[] = [];
	for (const [msgIdx, msg] of messages.entries()) {
		if (msg.role !== "assistant") {
			result.push(msg);
			continue;
		}
		const parts = msg.parts.filter((part, partIdx) => {
			const itemId = getPartItemId(part);
			if (!itemId) return true;
			const last = lastOccurrence.get(itemId);
			return last?.msgIdx === msgIdx && last.partIdx === partIdx;
		});
		if (parts.length === 0) continue;
		if (parts.length === msg.parts.length) result.push(msg);
		else result.push({ ...msg, parts } as IeltsAgentsMessage);
	}
	return result;
}

function deduplicateReasoningParts(messages: IeltsAgentsMessage[]) {
	return messages.map((message) => {
		if (message.role !== "assistant" || message.parts.length === 0)
			return message;
		const lastIndexByItemId = new Map<string, number>();
		for (let i = 0; i < message.parts.length; i++) {
			const part = message.parts[i];
			if (part.type !== "reasoning") continue;
			const itemId = (
				part.providerMetadata?.openai as { itemId?: string } | undefined
			)?.itemId;
			if (typeof itemId === "string") lastIndexByItemId.set(itemId, i);
		}
		if (lastIndexByItemId.size === 0) return message;
		const parts = message.parts.filter((part, index) => {
			if (part.type !== "reasoning") return true;
			const itemId = (
				part.providerMetadata?.openai as { itemId?: string } | undefined
			)?.itemId;
			if (typeof itemId !== "string") return true;
			return lastIndexByItemId.get(itemId) === index;
		});
		if (parts.length === 0) return message;
		return { ...message, parts } as IeltsAgentsMessage;
	});
}

function removeTrailingEmptyAssistantMessages(messages: IeltsAgentsMessage[]) {
	let end = messages.length;
	while (
		end > 0 &&
		messages[end - 1].role === "assistant" &&
		messages[end - 1].parts.length === 0
	)
		end--;
	return end === messages.length ? messages : messages.slice(0, end);
}

export function cleanMessages(
	messages: IeltsAgentsMessage[],
): IeltsAgentsMessage[] {
	const afterMsgDedup = deduplicateMessagesByIdField(messages);
	const afterItemDedup = deduplicateProviderItemIds(afterMsgDedup);
	const afterReasoningDedup = deduplicateReasoningParts(afterItemDedup);
	return removeTrailingEmptyAssistantMessages(afterReasoningDedup);
}
