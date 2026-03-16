import { execSync } from "node:child_process";
import path from "node:path";
import { faker } from "@faker-js/faker";
import type { GeneratorCallback, Tree } from "@nx/devkit";
import { formatFiles } from "@nx/devkit";

interface Options {
	content: string;
	type: "patch" | "minor" | "major";
	commit?: boolean;
}

export default async function createCoder(
	tree: Tree,
	{ type, content, commit }: Options,
): Promise<undefined | GeneratorCallback> {
	let versionPlanFilePath: string;
	do {
		versionPlanFilePath = path.join(
			".nx",
			"version-plans",
			`${faker.lorem.slug(5)}.md`,
		);
	} while (tree.exists(versionPlanFilePath));
	const message = content.trim();
	tree.write(
		versionPlanFilePath,
		`
---
__default__: ${type}
---

${message}
`,
	);
	await formatFiles(tree);
	return () => {
		if (!commit) return;
		const execOptions = { cwd: tree.root, stdio: "inherit" } as const;
		execSync("git add -A", execOptions);
		execSync(`git commit -m '${message}'`, execOptions);
	};
}
