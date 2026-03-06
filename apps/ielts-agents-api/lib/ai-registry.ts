import { openai } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";

export const aiRegistry = createProviderRegistry({
  openai,
});
