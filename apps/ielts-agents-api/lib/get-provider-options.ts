import type { JSONValue, LanguageModel } from "ai";

export function getProviderOptions(
  model: LanguageModel,
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
