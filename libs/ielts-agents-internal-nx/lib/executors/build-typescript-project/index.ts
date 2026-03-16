import { execSync } from "node:child_process";
import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { Extractor } from "@microsoft/api-extractor";
import type { ExecutorContext } from "@nx/devkit";
import { readJsonFile, writeJsonFile } from "@nx/devkit";
import type { Platform } from "esbuild";
import { build } from "esbuild";
import type { PackageJson, TsConfigJson } from "type-fest";
import type { BuildableExport } from "#./lib/buildable-export.ts";

import { distDir } from "#./lib/dist-dir.ts";
import { distPrefix } from "#./lib/dist-prefix.ts";
import { libDir } from "#./lib/lib-dir.ts";
import { libPrefix } from "#./lib/lib-prefix.ts";

function getTarget(platform: Platform) {
	switch (platform) {
		case "node": {
			return "node24";
		}
		default: {
			return "es2024";
		}
	}
}

interface ExecutorInput {
	exports: Record<string, BuildableExport>;
	platform: "neutral" | "node" | "browser";
}

export default async function buildTypeScriptProject(
	input: ExecutorInput,
	context: ExecutorContext,
): Promise<{ success: boolean }> {
	if (!context.projectName) return { success: false };
	const project = context.projectsConfigurations.projects[context.projectName];
	const absWorkingDir = path.join(context.root, project.root);
	const rootPackageJson = readJsonFile<PackageJson>(
		path.join(context.root, "package.json"),
	);
	const projectPackageJson = readJsonFile<PackageJson>(
		path.join(absWorkingDir, "package.json"),
	);
	await rm(path.join(absWorkingDir, distDir), { recursive: true, force: true });
	const entryPoints = Object.values(input.exports)
		.map(({ entryPoint }) => entryPoint)
		.filter((entryPoint) => !entryPoint.endsWith(".d.ts"));
	if (entryPoints.length > 0) {
		await build({
			entryPoints,
			absWorkingDir,
			platform: input.platform,
			target: getTarget(input.platform),
			outbase: libDir,
			outdir: distDir,
			external: [
				"node:*",
				...Object.keys({
					...rootPackageJson.dependencies,
					...rootPackageJson.peerDependencies,
					...rootPackageJson.optionalDependencies,
					...rootPackageJson.devDependencies,
					...projectPackageJson.dependencies,
					...projectPackageJson.peerDependencies,
					...projectPackageJson.optionalDependencies,
					...projectPackageJson.devDependencies,
				}),
			],
			tsconfig: "tsconfig.json",
			format: "esm",
			sourcemap: "external",
			legalComments: "none",
			bundle: true,
			minify: true,
			splitting: true,
		});
	}
	const dtsRollups = Object.values(input.exports)
		.filter(({ dtsRollup }) => dtsRollup)
		.map(({ entryPoint }) => entryPoint);
	if (dtsRollups.length > 0) {
		try {
			const tsConfigJson = readJsonFile<TsConfigJson>(
				path.join(absWorkingDir, "tsconfig.json"),
			);
			tsConfigJson.compilerOptions = {
				...tsConfigJson.compilerOptions,
				rootDir: libDir,
				outDir: distDir,
				declarationDir: ".api-extractor",
				incremental: false,
				noEmit: false,
				declaration: true,
				emitDeclarationOnly: true,
			};
			writeJsonFile(
				path.join(absWorkingDir, "tsconfig.api-extractor.json"),
				tsConfigJson,
			);
			execSync("tsc -p tsconfig.api-extractor.json", {
				cwd: absWorkingDir,
				stdio: "inherit",
			});
			const apiExtractorConfigFilePath = path.join(
				absWorkingDir,
				".api-extractor",
				"api-extractor.json",
			);
			for (const dtsRollup of dtsRollups) {
				const parsedPath = path.parse(dtsRollup.slice(libPrefix.length));
				const entryPoint = `${
					parsedPath.dir
						? `${parsedPath.dir}/${parsedPath.name}`
						: parsedPath.name
				}.d.ts`;
				writeJsonFile(apiExtractorConfigFilePath, {
					newlineKind: "lf",
					projectFolder: absWorkingDir,
					compiler: {
						tsconfigFilePath: "<projectFolder>/tsconfig.api-extractor.json",
					},
					mainEntryPointFilePath: `<projectFolder>/.api-extractor/${entryPoint}`,
					dtsRollup: {
						enabled: true,
						untrimmedFilePath: `<projectFolder>/${distDir}/${entryPoint}`,
					},
					apiReport: { enabled: false },
					docModel: { enabled: false },
					tsdocMetadata: { enabled: false },
					messages: {
						extractorMessageReporting: {
							"ae-wrong-input-file-type": { logLevel: "none" },
							"ae-missing-release-tag": { logLevel: "none" },
							"ae-forgotten-export": { logLevel: "none" },
						},
					},
				});
				Extractor.loadConfigAndInvoke(apiExtractorConfigFilePath);
			}
		} finally {
			await Promise.all(
				["tsconfig.api-extractor.json", ".api-extractor"].map(async (it) =>
					rm(path.join(absWorkingDir, it), { recursive: true, force: true }),
				),
			);
		}
	}
	const dtsFiles = Object.values(input.exports)
		.map(({ entryPoint }) => entryPoint)
		.filter((entryPoint) => entryPoint.endsWith(".d.ts"));
	if (dtsFiles.length > 0) {
		await Promise.all(
			dtsFiles.map((dtsFile) =>
				copyFile(
					path.join(absWorkingDir, dtsFile),
					path.join(
						absWorkingDir,
						`${distPrefix}${dtsFile.slice(libPrefix.length)}`,
					),
				),
			),
		);
	}
	return {
		success:
			entryPoints.length > 0 || dtsRollups.length > 0 || dtsFiles.length > 0,
	};
}
