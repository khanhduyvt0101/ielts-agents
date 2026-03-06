import type { IeltsAgentsMessagePart } from "#./lib/ielts-agents-message-part.ts";

export type IeltsAgentsTextPart = Extract<
  IeltsAgentsMessagePart,
  { type: "text" }
>;
