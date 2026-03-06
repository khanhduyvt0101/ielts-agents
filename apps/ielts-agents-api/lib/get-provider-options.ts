import type { JSONValue } from "ai";

import type { AILanguageModelId } from "#./lib/ai-language-model-id.ts";

export function getProviderOptions(
  model: AILanguageModelId,
): Record<string, Record<string, JSONValue>> | undefined {
  switch (model) {
    case "openai:gpt-5-mini": {
      return {
        openai: {
          reasoningSummary: "auto",
        } satisfies Record<string, JSONValue>,
      };
    }
  }
}
