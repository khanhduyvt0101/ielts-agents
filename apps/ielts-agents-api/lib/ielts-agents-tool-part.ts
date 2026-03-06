import type { IeltsAgentsMessagePart } from "#./lib/ielts-agents-message-part.ts";

export type IeltsAgentsToolPart = Extract<
  IeltsAgentsMessagePart,
  { type: `tool-${string}` }
>;
