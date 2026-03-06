import type { IeltsAgentsMessagePart } from "#./lib/ielts-agents-message-part.ts";

export type ChatAcademiaReasoningPart = Extract<
  IeltsAgentsMessagePart,
  { type: "reasoning" }
>;
