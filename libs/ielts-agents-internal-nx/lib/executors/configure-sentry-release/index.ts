import type { ExecutorContext } from "@nx/devkit";
import type { PackageJson } from "type-fest";

import { readJsonFile } from "@nx/devkit";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function shouldUploadSourcemaps(
  context: ExecutorContext,
  projectName: string,
): boolean {
  const project = context.projectsConfigurations.projects[projectName];
  return (
    existsSync(path.join(context.root, project.root, "dist")) &&
    existsSync(path.join(context.root, project.root, "tsconfig.json"))
  );
}

function filterProjectNames(
  context: ExecutorContext,
  projectNames: Set<string>,
) {
  for (const projectName of projectNames) {
    if (!shouldUploadSourcemaps(context, projectName))
      projectNames.delete(projectName);
  }
}

function collectProjectNames(
  context: ExecutorContext,
  projectName: string,
  projectNames: Set<string>,
) {
  if (
    !(projectName in context.projectsConfigurations.projects) ||
    projectNames.has(projectName)
  )
    return;
  projectNames.add(projectName);
  const packageJson = readJsonFile<PackageJson>(
    path.join(
      context.root,
      context.projectsConfigurations.projects[projectName].root,
      "package.json",
    ),
  );
  if (packageJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(
      packageJson.dependencies,
    )) {
      if (depVersion?.startsWith("workspace:"))
        collectProjectNames(context, depName, projectNames);
    }
  }
}

interface ExecutorInput {
  authToken: string;
  org: string;
  project: string;
  release: string;
  dist?: string;
  git?: {
    repo: string;
    commit: string;
  };
}

export default async function configureSentryRelease(
  input: ExecutorInput,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  await Promise.resolve();
  if (
    !context.projectName ||
    !shouldUploadSourcemaps(context, context.projectName)
  )
    return { success: false };
  const projectNames = new Set<string>();
  collectProjectNames(context, context.projectName, projectNames);
  filterProjectNames(context, projectNames);
  const outDirs = [...projectNames].map((projectName) =>
    path.join(
      context.root,
      context.projectsConfigurations.projects[projectName].root,
      "dist",
    ),
  );
  const releaseArgs = [
    "--auth-token",
    input.authToken,
    "--org",
    input.org,
    "--project",
    input.project,
  ];
  const execOptions = { cwd: context.root, stdio: "inherit" } as const;
  execSync(
    `sentry-cli releases new ${releaseArgs.join(" ")} ${input.release}`,
    execOptions,
  );
  if (input.git) {
    execSync(
      `sentry-cli releases set-commits ${releaseArgs.join(" ")} --commit ${input.git.repo}@${input.git.commit} --ignore-missing ${input.release}`,
      execOptions,
    );
  }
  const injectArgs = [...releaseArgs, "--release", input.release];
  execSync(
    `sentry-cli sourcemaps inject ${injectArgs.join(" ")} ${outDirs.join(" ")}`,
    execOptions,
  );
  const uploadArgs = [...injectArgs];
  if (input.dist) uploadArgs.push("--dist", input.dist);
  for (const outDir of outDirs) {
    execSync(
      `sentry-cli sourcemaps upload ${uploadArgs.join(" ")} --url-prefix ${outDir} --note ${outDir} ${outDir}`,
      execOptions,
    );
  }
  return { success: true };
}
