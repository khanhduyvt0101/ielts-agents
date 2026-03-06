import { z } from "zod";

import { readingTools } from "#./lib/reading-tools.ts";

export const readingToolIdSchema = z.enum(
  Object.keys(readingTools) as [
    keyof typeof readingTools,
    ...(keyof typeof readingTools)[],
  ],
);
