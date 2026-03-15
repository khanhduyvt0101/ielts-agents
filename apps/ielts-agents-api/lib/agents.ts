import { listeningAgent } from "#./lib/listening-agent.ts";
import { readingAgent } from "#./lib/reading-agent.ts";
import { writingAgent } from "#./lib/writing-agent.ts";

export const agents = {
  reading: readingAgent,
  listening: listeningAgent,
  writing: writingAgent,
};

export type Agents = typeof agents;
