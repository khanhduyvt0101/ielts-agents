import { listeningAgent } from "#./lib/listening-agent.ts";
import { readingAgent } from "#./lib/reading-agent.ts";
import { speakingAgent } from "#./lib/speaking-agent.ts";
import { writingAgent } from "#./lib/writing-agent.ts";

export const agents = {
  reading: readingAgent,
  listening: listeningAgent,
  writing: writingAgent,
  speaking: speakingAgent,
};

export type Agents = typeof agents;
