import type { Chat } from "@ai-sdk/react";
import type { AgentId, AgentMessage } from "ielts-agents-api/types";

import { useContext } from "react";

import { ChatContext } from "#./lib/chat-context.ts";

export function useChatContext<T extends AgentId>(): Chat<AgentMessage[T]> {
  const context = useContext(ChatContext);
  if (!context) throw new Error("No chat found");
  return context as unknown as Chat<AgentMessage[T]>;
}
