import { aiRegistry } from "#./lib/ai-registry.ts";
import { getProviderOptions } from "#./lib/get-provider-options.ts";

export const defaultAgentOptions = {
  model: aiRegistry.languageModel("openai:gpt-5.2-chat-latest"),
  providerOptions: getProviderOptions("openai:gpt-5.2-chat-latest"),
} as const;
