import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DotenvParseOutput } from "dotenv";
import dotenv from "dotenv";

export async function readEnvFiles(
	workspaceRoot: string,
	projectRoot: string,
	envFiles = [".properties", ".vars", ".secrets"],
) {
	const absWorkspaceRoot = path.isAbsolute(workspaceRoot)
		? workspaceRoot
		: path.join(process.cwd(), workspaceRoot);
	const absProjectRoot = path.isAbsolute(projectRoot)
		? projectRoot
		: path.join(absWorkspaceRoot, projectRoot);
	const output: DotenvParseOutput = {};
	const contents = await Promise.all(
		[
			...envFiles.map((envFile) => path.join(absWorkspaceRoot, envFile)),
			...envFiles.map((envFile) =>
				path.join(absWorkspaceRoot, ".local", envFile),
			),
			...envFiles.map((envFile) => path.join(absProjectRoot, envFile)),
			...envFiles.map((envFile) =>
				path.join(absProjectRoot, ".local", envFile),
			),
		]
			.filter((envFile) => existsSync(envFile))
			.map((envFile) => readFile(envFile, "utf8")),
	);
	Object.assign(output, ...contents.map((content) => dotenv.parse(content)));
	return output;
}
