import type { ExecutorContext } from "@nx/devkit";
import type { PackageJson } from "type-fest";

import { readJsonFile } from "@nx/devkit";
import { appendFile } from "node:fs/promises";
import path from "node:path";

import { getDockerContext } from "#./lib/get-docker-context.ts";

export default async function prepareGitHubActions(
  input: object,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  if (
    !context.projectName ||
    !process.env.GITHUB_OUTPUT ||
    !process.env.GITHUB_REPOSITORY ||
    !process.env.GITHUB_SHA
  )
    return { success: false };
  const project = context.projectsConfigurations.projects[context.projectName];
  const packageJson = readJsonFile<PackageJson>(
    path.join(context.root, project.root, "package.json"),
  );
  let envPrefix = "";
  if (project.projectType === "application") {
    if (packageJson.dependencies?.next) envPrefix = "NEXT_PUBLIC_";
    else if (packageJson.devDependencies?.["@react-router/dev"])
      envPrefix = "VITE_";
  }
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `
workspace-root=${context.root}
project-root=${path.join(context.root, project.root)}
docker-context=dist/${getDockerContext(context.projectName)}
env-prefix=${envPrefix}
source=https://github.com/${process.env.GITHUB_REPOSITORY}
version=${packageJson.version}
description=${(packageJson.description ?? "") || `${context.projectName}@${packageJson.version}`}
url=${(packageJson.homepage ?? "") || `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}/${project.root}`}
licenses=${(packageJson.license ?? "") || "UNLICENSED"}
`.trim(),
    "utf8",
  );
  return { success: true };
}
