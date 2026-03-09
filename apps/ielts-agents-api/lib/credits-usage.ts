export interface CreditsUsage {
  passageGeneratedCount: number;
  questionsGeneratedCount: number;
  scriptGeneratedCount: number;
  audioGeneratedCount: number;
}

export function createCreditsUsage(): CreditsUsage {
  return {
    passageGeneratedCount: 0,
    questionsGeneratedCount: 0,
    scriptGeneratedCount: 0,
    audioGeneratedCount: 0,
  };
}

const creditsPerPassageGenerated = 5;
const creditsPerQuestionsGenerated = 5;
const creditsPerScriptGenerated = 5;
const creditsPerAudioGenerated = 3;

export function calculateTotalCredits(usage: CreditsUsage): number {
  return (
    usage.passageGeneratedCount * creditsPerPassageGenerated +
    usage.questionsGeneratedCount * creditsPerQuestionsGenerated +
    usage.scriptGeneratedCount * creditsPerScriptGenerated +
    usage.audioGeneratedCount * creditsPerAudioGenerated
  );
}
