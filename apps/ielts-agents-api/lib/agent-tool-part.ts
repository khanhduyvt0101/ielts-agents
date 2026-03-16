import type { AgentId } from "#./lib/agent-id.ts";
import type { AgentMessagePart } from "#./lib/agent-message-part.ts";

export type AgentToolPart = {
	[T in AgentId]: Extract<AgentMessagePart[T], { type: `tool-${string}` }>;
};
