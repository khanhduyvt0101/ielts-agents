import type { AgentId } from "#./lib/agent-id.ts";
import type { Agents } from "#./lib/agents.ts";

export type AgentMessage = {
	[T in AgentId]: Agents[T]["message"];
};
