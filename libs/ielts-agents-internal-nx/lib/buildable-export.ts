import type { z } from "zod";

import type { buildableExportSchema } from "#./lib/buildable-export-schema.ts";

export type BuildableExport = z.infer<typeof buildableExportSchema>;
