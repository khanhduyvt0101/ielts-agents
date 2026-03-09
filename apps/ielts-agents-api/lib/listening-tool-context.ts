import type { CreditsUsage } from "#./lib/credits-usage.ts";

export interface ListeningToolContext {
  id: number;
  creditsUsage: CreditsUsage;
  onListeningUpdate: () => void;
}
