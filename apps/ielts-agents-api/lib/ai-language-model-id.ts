import type { AIProviderId } from "#./lib/ai-provider-id.ts";
import type { AIProviders } from "#./lib/ai-providers.ts";

type ExtractStringLiterals<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

export type AILanguageModelId = {
  [T in AIProviderId]: `${T}:${ExtractStringLiterals<
    Parameters<AIProviders[T]["languageModel"]>[0]
  >}`;
}[AIProviderId];
