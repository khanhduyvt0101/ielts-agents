import type { ProviderRegistryProvider } from "ai";

import type { aiRegistry } from "#./lib/ai-registry.ts";

type ExtractAIProviders<T> =
  T extends ProviderRegistryProvider<infer P> ? P : never;

export type AIProviders = ExtractAIProviders<typeof aiRegistry>;
