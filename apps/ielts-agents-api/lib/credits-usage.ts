export interface CreditsUsage {
  passageGeneratedCount: number;
  questionsGeneratedCount: number;
}

export function createCreditsUsage(): CreditsUsage {
  return {
    passageGeneratedCount: 0,
    questionsGeneratedCount: 0,
  };
}

const creditsPerPassageGenerated = 5;
const creditsPerQuestionsGenerated = 5;

export function calculateTotalCredits(usage: CreditsUsage): number {
  return (
    usage.passageGeneratedCount * creditsPerPassageGenerated +
    usage.questionsGeneratedCount * creditsPerQuestionsGenerated
  );
}
