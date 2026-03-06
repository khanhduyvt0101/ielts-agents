import { z } from "zod";

export const buildableExportSchema = z
  .object({ entryPoint: z.string(), dtsRollup: z.boolean() })
  .strict();
