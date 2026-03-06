import type { BuildableExport } from "#./lib/buildable-export.ts";

import { buildableExportSchema } from "#./lib/buildable-export-schema.ts";

export function isBuildableExport(value: unknown): value is BuildableExport {
  return buildableExportSchema.safeParse(value).success;
}
