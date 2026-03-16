import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { readJsonFile } from "@nx/devkit";
import { deleteAsync } from "del";

const workspaceRoot = execSync("pnpm -w exec pwd", { encoding: "utf8" }).trim();

const projects = {};

for (const project of JSON.parse(
	execSync("pnpm list --recursive --depth -1 --json", {
		cwd: workspaceRoot,
		encoding: "utf8",
	}).trim(),
)) {
	if (!project.name || !project.path || workspaceRoot === project.path)
		continue;
	projects[project.name] = { root: path.relative(workspaceRoot, project.path) };
}

await deleteAsync("*", {
	ignore: ["apps", "libs"],
	cwd: workspaceRoot,
	dot: true,
});

const projectNames = new Set();

const projectStack = [process.argv[2]];

while (projectStack.length > 0) {
	const projectName = projectStack.pop();
	if (projectNames.has(projectName)) continue;
	projectNames.add(projectName);
	const packageJson = readJsonFile(
		path.join(workspaceRoot, projects[projectName].root, "package.json"),
	);
	if (packageJson.dependencies)
		projectStack.push(
			...Object.entries(packageJson.dependencies)
				.filter(([, version]) => version.startsWith("workspace:"))
				.map(([name]) => name),
		);
}

const nonSourceFiles = ["map", "tsbuildinfo"].map((ext) => `*.${ext}`);

await Promise.all([
	...Object.keys(projects)
		.filter((projectName) => !projectNames.has(projectName))
		.map((projectName) =>
			rm(path.join(workspaceRoot, projects[projectName].root), {
				recursive: true,
				force: true,
			}),
		),
	...[...projectNames].map(async (projectName) => {
		const project = projects[projectName];
		const packageJson = readJsonFile(
			path.join(workspaceRoot, project.root, "package.json"),
		);
		const patterns = ["*", ...nonSourceFiles, "!drizzle", "!bin"];
		if (packageJson.dependencies?.next) {
			patterns.push(
				"!next.config.js",
				"!.next",
				".next/dev",
				".next/cache",
				...nonSourceFiles.map((file) => `.next/**/${file}`),
			);
		} else if (packageJson.devDependencies?.["@react-router/dev"]) {
			patterns.push(
				"!build",
				"build/*",
				"!build/client",
				...nonSourceFiles.map((file) => `build/client/**/${file}`),
				"!build/server",
				...nonSourceFiles.map((file) => `build/server/**/${file}`),
			);
		} else if (
			existsSync(path.join(workspaceRoot, project.root, "dist")) &&
			existsSync(path.join(workspaceRoot, project.root, "tsconfig.json"))
		) {
			patterns.push(
				"!dist",
				...nonSourceFiles.map((file) => `dist/**/${file}`),
			);
		} else {
			patterns.push("!lib", ...nonSourceFiles.map((file) => `lib/**/${file}`));
		}
		await deleteAsync(patterns, {
			cwd: path.join(workspaceRoot, project.root),
			dot: true,
		});
	}),
]);
