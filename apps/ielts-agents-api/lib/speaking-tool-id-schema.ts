import { z } from "zod";

import { speakingTools } from "#./lib/speaking-tools.ts";

export const speakingToolIdSchema = z.enum(
  Object.keys(speakingTools) as [
    keyof typeof speakingTools,
    ...(keyof typeof speakingTools)[],
  ],
);
