import { existsSync } from "node:fs";
import path from "node:path";
import type { PackageJson } from "type-fest";
import { z } from "zod";
import type { BuildableExport } from "#./lib/buildable-export.ts";

import { distPrefix } from "#./lib/dist-prefix.ts";
import { isBuildableExport } from "#./lib/is-buildable-export.ts";
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
	.transform<BuildableExport>((simpleExport) => ({
		entryPoint: simpleExport,
		dtsRollup: false,
	}));

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
	)
	.transform<BuildableExport>((conditionalExport) => ({
		entryPoint: conditionalExport.import,
		dtsRollup: Boolean(conditionalExport.types),
	}));

const exportsSchema = z.union([
	simpleExportSchema,
	conditionalExportSchema,
	z
		.record(z.string(), z.union([simpleExportSchema, conditionalExportSchema]))
		.refine((it) => Object.keys(it).length > 0),
]);

function resolveEntryPoint(projectRoot: string, entryPoint: string): string {
	if (entryPoint.startsWith(libPrefix)) return entryPoint;
	const withoutPrefix = entryPoint.slice(distPrefix.length);
	if (withoutPrefix.endsWith(".d.ts")) {
		const libExport = `${libPrefix}${withoutPrefix}`;
		if (existsSync(path.join(projectRoot, libExport))) return libExport;
	} else {
		const trimmed = withoutPrefix.slice(0, -path.extname(withoutPrefix).length);
		for (const extname of [".ts", ".tsx"]) {
			const libExport = `${libPrefix}${trimmed}${extname}`;
			if (existsSync(path.join(projectRoot, libExport))) return libExport;
		}
	}
	throw new Error(`Failed to find ${libPrefix}* for ${entryPoint}`);
}

export function resolveBuildableExports(
	projectRoot: string,
	projectExports: PackageJson.Exports | undefined,
): Record<string, BuildableExport> | undefined {
	if (!projectExports) return;
	const parsedExports = exportsSchema.parse(projectExports);
	const buildableExports: Record<string, BuildableExport> = isBuildableExport(
		parsedExports,
	)
		? { ".": parsedExports }
		: parsedExports;
	return Object.fromEntries<BuildableExport>(
		Object.entries<BuildableExport>(buildableExports).map<
			[string, BuildableExport]
		>(([entryKey, { entryPoint, dtsRollup }]) => [
			entryKey,
			{ entryPoint: resolveEntryPoint(projectRoot, entryPoint), dtsRollup },
		]),
	);
}
