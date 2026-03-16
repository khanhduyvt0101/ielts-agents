import type { CreditsUsage } from "#./lib/credits-usage.ts";

export interface WritingToolContext {
	id: number;
	creditsUsage: CreditsUsage;
	onWritingUpdate: () => void;
}
