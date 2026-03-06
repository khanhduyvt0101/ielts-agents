import { readingAgent } from "#./lib/reading-agent.ts";

export const agents = {
  reading: readingAgent,
};

export type Agents = typeof agents;
