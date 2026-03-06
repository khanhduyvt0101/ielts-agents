import { z } from "zod";

import { chatTools } from "#./lib/chat-tools.ts";

export const chatToolIdSchema = z.enum(
  Object.keys(chatTools) as [
    keyof typeof chatTools,
    ...(keyof typeof chatTools)[],
  ],
);
