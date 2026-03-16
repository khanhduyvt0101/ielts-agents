import type { CreditsUsage } from "#./lib/credits-usage.ts";

export interface SpeakingToolContext {
  id: number;
  creditsUsage: CreditsUsage;
  onSpeakingUpdate: () => void;
}
