import type {
	AgentId,
	AgentMessage,
	AgentToolPart,
} from "ielts-agents-api/types";
import type { ReactNode } from "react";

export type AgentRenderToolPart = {
	[T in AgentId]: (
		tool: AgentToolPart[T],
		message: AgentMessage[T],
		chatId: number,
	) => ReactNode;
};
