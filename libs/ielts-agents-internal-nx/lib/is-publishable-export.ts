import type { PublishableExport } from "#./lib/publishable-export.ts";

import { publishableExportSchema } from "#./lib/publishable-export-schema.ts";

export function isPublishableExport(
  value: unknown,
): value is PublishableExport {
  return publishableExportSchema.safeParse(value).success;
}
