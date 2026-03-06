import type { AgentId } from "#./lib/agent-id.ts";
import type { AgentMessage } from "#./lib/agent-message.ts";

export type AgentMessagePart = {
  [T in AgentId]: AgentMessage[T]["parts"][number];
};
