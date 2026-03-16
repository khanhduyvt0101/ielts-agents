import type { BandScore } from "#./lib/band-score.ts";

export interface DefaultAgentConfig {
	bandScore: BandScore;
	questionTypes: string[];
}
