import { listeningAgent } from "#./lib/listening-agent.ts";
import { readingAgent } from "#./lib/reading-agent.ts";

export const agents = {
  reading: readingAgent,
  listening: listeningAgent,
};

export type Agents = typeof agents;
