import type { PackageJson } from "type-fest";

import type { PublishableExport } from "#./lib/publishable-export.ts";

import path from "node:path";
import { z } from "zod";

import { distPrefix } from "#./lib/dist-prefix.ts";
import { getDistExport } from "#./lib/get-dist-export.ts";
import { isPublishableExport } from "#./lib/is-publishable-export.ts";
import { libPrefix } from "#./lib/lib-prefix.ts";

const simpleExportSchema = z
  .string()
  .refine(
    (it) =>
      (it.startsWith(distPrefix) &&
        (it.endsWith(".d.ts") || it.endsWith(".js"))) ||
      (it.startsWith(libPrefix) &&
        (it.endsWith(".d.ts") || it.endsWith(".ts") || it.endsWith(".tsx"))),
  )
  .transform(getDistExport);

const conditionalExportSchema = z
  .object({
    types: z.string().startsWith(distPrefix).endsWith(".d.ts").optional(),
    import: z.string().startsWith(distPrefix).endsWith(".js"),
  })
  .strict()
  .refine(
    (it) =>
      !it.types ||
      it.types ===
        `${it.import.slice(0, -path.extname(it.import).length)}.d.ts`,
  );

const exportsSchema = z.union([
  simpleExportSchema,
  conditionalExportSchema,
  z
    .record(z.string(), z.union([simpleExportSchema, conditionalExportSchema]))
    .refine((it) => Object.keys(it).length > 0),
]);

function resolvePublishableExport(
  entryPoint: PublishableExport,
  dtsRollup?: boolean,
): PublishableExport {
  if (
    typeof entryPoint === "object" ||
    entryPoint.endsWith(".d.ts") ||
    !dtsRollup
  )
    return entryPoint;
  return {
    types: `${entryPoint.slice(0, -path.extname(entryPoint).length)}.d.ts`,
    import: entryPoint,
  };
}

export function resolvePublishableExports(
  projectExports: PackageJson.Exports | undefined,
  dtsRollup?: boolean,
): Record<string, PublishableExport> | undefined {
  if (!projectExports) return;
  const parsedExports = exportsSchema.parse(projectExports);
  const publishableExports: Record<string, PublishableExport> =
    isPublishableExport(parsedExports) ? { ".": parsedExports } : parsedExports;
  return Object.fromEntries<PublishableExport>(
    Object.entries<PublishableExport>(publishableExports).map<
      [string, PublishableExport]
    >(([entryKey, entryPoint]) => [
      entryKey,
      resolvePublishableExport(entryPoint, dtsRollup),
    ]),
  );
}
