import type { IeltsAgentsMessagePart } from "#./lib/ielts-agents-message-part.ts";

export type IeltsAgentsReasoningPart = Extract<
	IeltsAgentsMessagePart,
	{ type: "reasoning" }
>;
