import type { LanguageModel, LanguageModelUsage } from "ai";

const dollarsPerInputTokenGPT5Mini = 0.25 / 1_000_000;
const dollarsPerOutputTokenGPT5Mini = 2 / 1_000_000;

const dollarsPerInputTokenGPT52 = 1.75 / 1_000_000;
const dollarsPerOutputTokenGPT52 = 14 / 1_000_000;

const dollarsPerCredit = 15 / 10_000;

export function languageModelUsageToCredits(
	languageModelUsage: LanguageModelUsage,
	model: LanguageModel,
) {
	const { inputTokens = 0, outputTokens = 0 } = languageModelUsage;
	let costInDollars = 0;
	switch (model) {
		case "openai:gpt-5-mini": {
			costInDollars =
				inputTokens * dollarsPerInputTokenGPT5Mini +
				outputTokens * dollarsPerOutputTokenGPT5Mini;
			break;
		}
		case "openai:gpt-5.2-chat-latest": {
			costInDollars =
				inputTokens * dollarsPerInputTokenGPT52 +
				outputTokens * dollarsPerOutputTokenGPT52;
			break;
		}
		default: {
			throw new Error("Unknown model");
		}
	}
	return costInDollars / dollarsPerCredit;
}
