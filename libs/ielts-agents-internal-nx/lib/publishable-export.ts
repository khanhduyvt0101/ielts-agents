import type { z } from "zod";

import type { publishableExportSchema } from "#./lib/publishable-export-schema.ts";

export type PublishableExport = z.infer<typeof publishableExportSchema>;
