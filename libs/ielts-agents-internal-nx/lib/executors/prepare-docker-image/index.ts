import type { ExecutorContext } from "@nx/devkit";
import type { PackageJson } from "type-fest";

import { normalizePath, readJsonFile, writeJsonFile } from "@nx/devkit";
import ignore from "ignore";
import { pick } from "lodash";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { getDockerContext } from "#./lib/get-docker-context.ts";
import { readEnvFiles } from "#./lib/read-env-files.ts";
import { resolvePublishableExports } from "#./lib/resolve-publishable-exports.ts";
import pluginPackageJson from "#./package.json";

async function recreateDirectory(directory: string) {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
}

async function copyDirectory(
  source: string,
  destination: string,
  workspaceRoot: string,
  ignorer?: ignore.Ignore,
  excludeDirs?: string[],
) {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entrySourcePath = path.join(source, entry.name);
      const entryRelativePath = path.relative(workspaceRoot, entrySourcePath);
      if (ignorer?.ignores(entryRelativePath)) return;
      const entryNormalizedPath = normalizePath(entryRelativePath);
      if (
        excludeDirs?.some(
          (excludeDir) =>
            entryNormalizedPath === excludeDir ||
            entryNormalizedPath.startsWith(`${excludeDir}/`),
        )
      )
        return;
      const entryDestinationPath = path.join(destination, entry.name);
      await (entry.isDirectory()
        ? copyDirectory(
            entrySourcePath,
            entryDestinationPath,
            workspaceRoot,
            ignorer,
            excludeDirs,
          )
        : copyFile(entrySourcePath, entryDestinationPath));
    }),
  );
}

function collectProjectNamesForDevelopment(
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
  for (const { target } of context.projectGraph.dependencies[projectName])
    collectProjectNamesForDevelopment(context, target, projectNames);
}

function collectProjectNamesForProduction(
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
  const projectPackageJson = readJsonFile<PackageJson>(
    path.join(
      context.root,
      context.projectsConfigurations.projects[projectName].root,
      "package.json",
    ),
  );
  if (projectPackageJson.dependencies) {
    for (const [projectName, projectVersion] of Object.entries(
      projectPackageJson.dependencies,
    )) {
      if (projectVersion?.startsWith("workspace:"))
        collectProjectNamesForProduction(context, projectName, projectNames);
    }
  }
}

interface ExecutorInput {
  dtsRollups: Record<string, boolean>;
  base: "alpine" | "slim";
  script: string;
  port?: number;
}

function updatePackageJsonForDevelopment(
  directory: string,
  input: ExecutorInput,
  context: ExecutorContext,
  projectName: string,
) {
  const project = context.projectsConfigurations.projects[projectName];
  if (!existsSync(path.join(context.root, project.root, "tsconfig.json")))
    return;
  const packageJsonPath = path.join(directory, project.root, "package.json");
  const packageJsonData = readJsonFile<PackageJson>(packageJsonPath);
  packageJsonData.exports = resolvePublishableExports(
    packageJsonData.exports,
    input.dtsRollups[projectName],
  );
  writeJsonFile(packageJsonPath, packageJsonData);
}

function updatePackageJsonForProduction(
  directory: string,
  input: ExecutorInput,
  context: ExecutorContext,
  projectName?: string,
) {
  const packageJsonPath = projectName
    ? path.join(
        directory,
        context.projectsConfigurations.projects[projectName].root,
        "package.json",
      )
    : path.join(directory, "package.json");
  const packageJsonForDevelopment = readJsonFile<PackageJson>(packageJsonPath);
  const packageJsonForProduction = pick<PackageJson>(
    structuredClone(packageJsonForDevelopment),
    "packageManager",
    "name",
    "version",
    "private",
    "type",
    "bin",
    "exports",
    "imports",
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  );
  if (projectName) {
    if (
      existsSync(
        path.join(
          context.root,
          context.projectsConfigurations.projects[projectName].root,
          "tsconfig.json",
        ),
      )
    ) {
      packageJsonForProduction.exports = resolvePublishableExports(
        packageJsonForProduction.exports,
        input.dtsRollups[projectName],
      );
    }
    if (projectName === context.projectName)
      packageJsonForProduction.scripts = { start: input.script };
  }
  writeJsonFile(packageJsonPath, packageJsonForProduction);
}

function getShellCommand(base: string): string {
  switch (base) {
    case "alpine": {
      return "sh";
    }
    default: {
      return "bash";
    }
  }
}

function getInstallCommand(base: string, packages: string[]): string {
  switch (base) {
    case "alpine": {
      return `apk add --no-cache ${packages.join(" ")}`;
    }
    default: {
      const segments = [
        "apt-get update",
        `apt-get install -y --no-install-recommends ${packages.join(" ")}`,
        "apt-get clean",
        "rm -rf /var/lib/apt/lists/*",
      ];
      return segments.join(" && ");
    }
  }
}

function getSentryPackages(base: string): string[] {
  const packages: string[] = [];
  switch (base) {
    case "slim": {
      packages.push("ca-certificates");
      break;
    }
  }
  packages.push("curl", "python3");
  return packages;
}

function getRuntimePackages(base: string): string[] {
  const packages: string[] = [];
  switch (base) {
    case "alpine": {
      packages.push("bash");
      break;
    }
    case "slim": {
      packages.push("ca-certificates");
      break;
    }
  }
  packages.push("curl");
  return packages;
}

export default async function prepareDockerImage(
  input: ExecutorInput,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  if (!context.projectName) return { success: false };
  const project = context.projectsConfigurations.projects[context.projectName];
  const builderRunArgs = [
    "--mount=type=secret,id=workspace-root-secrets,dst=/workspace/.secrets,uid=1000,gid=1000",
    "--mount=type=secret,id=workspace-local-secrets,dst=/workspace/.local/.secrets,uid=1000,gid=1000",
    `--mount=type=secret,id=project-root-secrets,dst=/workspace/${project.root}/.secrets,uid=1000,gid=1000`,
    `--mount=type=secret,id=project-local-secrets,dst=/workspace/${project.root}/.local/.secrets,uid=1000,gid=1000`,
  ].join(" ");
  const builderPreStatements: string[] = [];
  const builderPostStatements: string[] = [];
  if (project.targets?.["configure-sentry-release"]) {
    builderPreStatements.push(
      "USER root:root",
      `RUN ${getInstallCommand(input.base, getSentryPackages(input.base))}`,
      `RUN curl -fsSL https://sentry.io/get-cli | ${getShellCommand(input.base)}`,
      "USER node:node",
    );
    builderPostStatements.push(
      `RUN ${builderRunArgs} pnpm exec nx run ${context.projectName}:configure-sentry-release`,
    );
  }
  const output = path.join(
    context.root,
    "dist",
    getDockerContext(context.projectName),
  );
  const [env, nvmrc] = await Promise.all([
    readEnvFiles(context.root, project.root, [".properties", ".vars"]),
    readFile(path.join(context.root, ".nvmrc"), "utf8"),
    recreateDirectory(output),
  ]);
  const envStatements = Object.entries(env)
    .filter(([key, value]) => key && value)
    .map(([key, value]) => `ENV ${key}="${value}"`);
  const configStatements = input.port ? [`EXPOSE ${input.port}`] : [];
  await Promise.all([
    writeFile(
      path.join(output, ".dockerignore"),
      `
.dockerignore
Dockerfile
`.trim(),
    ),
    writeFile(
      path.join(output, "Dockerfile"),
      [
        `FROM node:${nvmrc.trim()}-${input.base} AS installer`,
        'ENV CI="true"',
        `ENV DOCKER_ENV="${process.env.CI === "1" || process.env.CI === "true" ? "live" : "local"}"`,
        'ENV NX_NO_CLOUD="true"',
        'ENV NX_PLUGIN_NO_TIMEOUTS="true"',
        'ENV PNPM_HOME="/pnpm"',
        "RUN corepack enable pnpm",
        "USER node:node",
        "WORKDIR /workspace",
        "COPY --chown=node:node ./installer ./",
        "RUN corepack install",
        "FROM installer AS builder",
        ...builderPreStatements,
        "COPY --chown=node:node ./builder0 ./",
        "RUN --mount=type=cache,target=/pnpm/store,uid=1000,gid=1000 pnpm install",
        "COPY --chown=node:node ./builder1 ./",
        "RUN pnpm exec nx run-many -t configure-local-dependencies",
        ...envStatements,
        `RUN ${builderRunArgs} pnpm exec nx run ${context.projectName}:build`,
        ...builderPostStatements,
        `RUN pnpm -F ${pluginPackageJson.name} exec node ./.docker/optimize.js ${context.projectName}`,
        "FROM installer AS runner",
        "USER root:root",
        `RUN ${getInstallCommand(input.base, getRuntimePackages(input.base))}`,
        "USER node:node",
        "COPY --chown=node:node ./runner ./",
        'ENV NODE_ENV="production"',
        "RUN --mount=type=cache,target=/pnpm/store,uid=1000,gid=1000 pnpm install --prod",
        "COPY --chown=node:node --from=builder /workspace ./",
        ...envStatements,
        ...configStatements,
        `CMD ["pnpm", "-F", "${context.projectName}", "start"]`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ]);
  const projectNames = new Set<string>();
  for (const projectName of [pluginPackageJson.name, context.projectName])
    collectProjectNamesForDevelopment(context, projectName, projectNames);
  const rootPackageJson = readJsonFile<PackageJson>(
    path.join(context.root, "package.json"),
  );
  if (rootPackageJson.scripts) delete rootPackageJson.scripts;
  const installer = path.join(output, "installer");
  const builder0 = path.join(output, "builder0");
  await Promise.all([
    mkdir(installer, { recursive: true }),
    mkdir(builder0, { recursive: true }),
  ]);
  writeJsonFile(
    path.join(installer, "package.json"),
    pick(rootPackageJson, "packageManager"),
  );
  writeJsonFile(path.join(builder0, "package.json"), rootPackageJson);
  const ignorer = ignore();
  const [gitignore, nxignore] = await Promise.all([
    readFile(path.join(context.root, ".gitignore"), "utf8"),
    readFile(path.join(context.root, ".nxignore"), "utf8"),
  ]);
  ignorer.add(gitignore);
  ignorer.add(nxignore);
  ignorer.add([
    "/package.json",
    ".properties",
    "drizzle.config.cjs",
    "playwright.config.js",
    "eslint.config.js",
    ".storybook",
    "*.stories.*",
  ]);
  await Promise.all([
    ...["pnpm-lock.yaml", "pnpm-workspace.yaml"].map(async (file) => {
      await copyFile(path.join(context.root, file), path.join(builder0, file));
      ignorer.add(`/${file}`);
    }),
    ...[...projectNames].map(async (projectName) => {
      const project = context.projectsConfigurations.projects[projectName];
      const dir = path.join(builder0, project.root);
      await mkdir(dir, { recursive: true });
      const promises: Promise<unknown>[] = [
        copyFile(
          path.join(context.root, project.root, "package.json"),
          path.join(dir, "package.json"),
        ),
      ];
      if (existsSync(path.join(context.root, project.root, "bin"))) {
        promises.push(
          copyDirectory(
            path.join(context.root, project.root, "bin"),
            path.join(dir, "bin"),
            context.root,
            ignorer,
          ),
        );
        ignorer.add(`/${project.root}/bin`);
      }
      await Promise.all(promises);
      updatePackageJsonForDevelopment(builder0, input, context, projectName);
    }),
  ]);
  const builder1 = path.join(output, "builder1");
  await copyDirectory(context.root, builder1, context.root, ignorer, [
    "apps",
    "libs",
  ]);
  await Promise.all(
    [...projectNames].map(async (projectName) => {
      const project = context.projectsConfigurations.projects[projectName];
      await copyDirectory(
        path.join(context.root, project.root),
        path.join(builder1, project.root),
        context.root,
        ignorer,
      );
      updatePackageJsonForDevelopment(builder1, input, context, projectName);
    }),
  );
  const runner = path.join(output, "runner");
  await copyDirectory(builder0, runner, context.root);
  updatePackageJsonForProduction(runner, input, context);
  const projectNamesForProduction = new Set<string>();
  collectProjectNamesForProduction(
    context,
    context.projectName,
    projectNamesForProduction,
  );
  await Promise.all(
    [...projectNames].map(async (projectName) => {
      const project = context.projectsConfigurations.projects[projectName];
      const builderPackageJson = readJsonFile<PackageJson>(
        path.join(builder0, project.root, "package.json"),
      );
      writeJsonFile(
        path.join(builder0, project.root, "package.json"),
        pick(
          builderPackageJson,
          "packageManager",
          "name",
          "private",
          "type",
          "bin",
          "dependencies",
          "peerDependencies",
          "optionalDependencies",
          "devDependencies",
        ),
      );
      if (projectNamesForProduction.has(projectName)) {
        updatePackageJsonForProduction(runner, input, context, projectName);
      } else {
        await rm(path.join(runner, project.root), {
          recursive: true,
          force: true,
        });
      }
    }),
  );
  for (const cwd of [builder0, runner]) {
    execSync("pnpm install --lockfile-only --fix-lockfile --ignore-scripts", {
      cwd,
    });
  }
  return { success: true };
}
