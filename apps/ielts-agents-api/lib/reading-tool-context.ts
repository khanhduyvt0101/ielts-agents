import type { CreditsUsage } from "#./lib/credits-usage.ts";

export interface ReadingToolContext {
	id: number;
	creditsUsage: CreditsUsage;
	onReadingUpdate: () => void;
}
