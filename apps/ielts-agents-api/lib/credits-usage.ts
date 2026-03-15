export interface CreditsUsage {
  passageGeneratedCount: number;
  questionsGeneratedCount: number;
  scriptGeneratedCount: number;
  audioGeneratedCount: number;
  taskGeneratedCount: number;
  essayEvaluatedCount: number;
}

export function createCreditsUsage(): CreditsUsage {
  return {
    passageGeneratedCount: 0,
    questionsGeneratedCount: 0,
    scriptGeneratedCount: 0,
    audioGeneratedCount: 0,
    taskGeneratedCount: 0,
    essayEvaluatedCount: 0,
  };
}

const creditsPerPassageGenerated = 5;
const creditsPerQuestionsGenerated = 5;
const creditsPerScriptGenerated = 5;
const creditsPerAudioGenerated = 3;
const creditsPerTaskGenerated = 5;
const creditsPerEssayEvaluated = 8;

export function calculateTotalCredits(usage: CreditsUsage): number {
  return (
    usage.passageGeneratedCount * creditsPerPassageGenerated +
    usage.questionsGeneratedCount * creditsPerQuestionsGenerated +
    usage.scriptGeneratedCount * creditsPerScriptGenerated +
    usage.audioGeneratedCount * creditsPerAudioGenerated +
    usage.taskGeneratedCount * creditsPerTaskGenerated +
    usage.essayEvaluatedCount * creditsPerEssayEvaluated
  );
}
