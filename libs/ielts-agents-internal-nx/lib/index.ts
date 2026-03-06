import type { CreateNodesV2, TargetConfiguration } from "@nx/devkit";
import type { PackageJson } from "type-fest";

import { createNodesFromFiles, readJsonFile } from "@nx/devkit";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { getDistExport } from "#./lib/get-dist-export.ts";
import { getDockerContext } from "#./lib/get-docker-context.ts";
import { readEnvFiles } from "#./lib/read-env-files.ts";
import { resolveBuildableExports } from "#./lib/resolve-buildable-exports.ts";
import pluginPackageJson from "#./package.json";

type Options =
  | Record<
      string,
      {
        betterAuth?: {
          configFile: string;
          outputFile: string;
        };
        dtsRollup?: boolean;
        emailPort?: number;
        servicePort?: number;
        serviceDependencies?: string[];
      }
    >
  | undefined;

function getProjectType(projectRoot: string) {
  if (projectRoot.startsWith("apps")) return "application";
  if (projectRoot.startsWith("libs")) return "library";
}

function getServiceDependsOn(
  packageJson: PackageJson,
  target: "dev" | "start",
  options: Options | undefined,
) {
  if (!packageJson.name) return;
  const projects = options?.[packageJson.name]?.serviceDependencies;
  if (!projects || projects.length === 0) return;
  return [{ projects, target }];
}

export const createNodesV2: CreateNodesV2<Options> = [
  "**/package.json",
  (paths, options, context) =>
    createNodesFromFiles(
      async (packageJsonPath) => {
        const packageJson = readJsonFile<PackageJson>(packageJsonPath);
        if (!packageJson.name) return {};
        const projectRoot = path.dirname(packageJsonPath);
        if (!existsSync(path.join(projectRoot, "tsconfig.json"))) return {};
        const projectType = getProjectType(projectRoot);
        const projectEnv: Record<string, string | undefined> =
          await readEnvFiles(context.workspaceRoot, projectRoot);
        const dtsRollups = Object.fromEntries(
          Object.entries(options ?? {}).map(([projectName, { dtsRollup }]) => [
            projectName,
            dtsRollup ?? false,
          ]),
        );
        const targets: Record<string, TargetConfiguration> = {
          typecheck: {
            cache: true,
            command: "tsc",
            options: { cwd: "{projectRoot}" },
            inputs: [
              "default",
              "^default",
              { externalDependencies: ["typescript", "tslib"] },
            ],
            outputs: ["{projectRoot}/*.tsbuildinfo"],
            dependsOn: ["build", "^typecheck"],
          },
        };
        if (existsSync(path.join(projectRoot, "eslint.config.js"))) {
          targets.lint = {
            cache: true,
            command: "eslint --no-error-on-unmatched-pattern",
            options: { cwd: "{projectRoot}" },
            inputs: [
              "default",
              "^default",
              { externalDependencies: ["typescript", "eslint"] },
            ],
            dependsOn: ["build", "^typecheck"],
          };
        }
        const isApplicationProject = projectType === "application";
        const isNextProject =
          isApplicationProject && Boolean(packageJson.dependencies?.next);
        const isReactRouterProject =
          isApplicationProject &&
          Boolean(packageJson.devDependencies?.["@react-router/dev"]);
        if (isNextProject) {
          projectEnv.NEXT_TELEMETRY_DISABLED = "1";
          projectEnv.NEXT_PUBLIC_VERCEL_ENV = process.env.VERCEL_ENV;
          projectEnv.NEXT_PUBLIC_CI = process.env.CI;
          if (
            process.env.VERCEL_ENV === "production" &&
            process.env.VERCEL_GIT_REPO_OWNER &&
            process.env.VERCEL_GIT_REPO_SLUG &&
            process.env.VERCEL_GIT_COMMIT_SHA &&
            process.env.VERCEL_URL &&
            process.env.SENTRY_AUTH_TOKEN &&
            process.env.SENTRY_ORG &&
            process.env.NEXT_PUBLIC_SENTRY_DSN
          ) {
            projectEnv.SENTRY_GIT_REPO = `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
            projectEnv.SENTRY_GIT_COMMIT = process.env.VERCEL_GIT_COMMIT_SHA;
            projectEnv.SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
            projectEnv.SENTRY_ORG = process.env.SENTRY_ORG;
            projectEnv.SENTRY_PROJECT = packageJson.name;
            projectEnv.SENTRY_RELEASE = `${packageJson.name}@${packageJson.version}`;
            projectEnv.NEXT_PUBLIC_SENTRY_RELEASE = projectEnv.SENTRY_RELEASE;
            projectEnv.NEXT_PUBLIC_SENTRY_DIST = process.env.VERCEL_URL;
            projectEnv.NEXT_PUBLIC_SENTRY_ENVIRONMENT = "vercel-production";
            projectEnv.NEXT_PUBLIC_SENTRY_DSN =
              process.env.NEXT_PUBLIC_SENTRY_DSN;
          }
        } else if (isReactRouterProject) {
          projectEnv.VITE_VERCEL_ENV = process.env.VERCEL_ENV;
          projectEnv.VITE_CI = process.env.CI;
          if (
            process.env.VERCEL_ENV === "production" &&
            process.env.VERCEL_GIT_REPO_OWNER &&
            process.env.VERCEL_GIT_REPO_SLUG &&
            process.env.VERCEL_GIT_COMMIT_SHA &&
            process.env.VERCEL_URL &&
            process.env.SENTRY_AUTH_TOKEN &&
            process.env.SENTRY_ORG &&
            process.env.VITE_SENTRY_DSN
          ) {
            projectEnv.SENTRY_GIT_REPO = `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
            projectEnv.SENTRY_GIT_COMMIT = process.env.VERCEL_GIT_COMMIT_SHA;
            projectEnv.SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
            projectEnv.SENTRY_ORG = process.env.SENTRY_ORG;
            projectEnv.SENTRY_PROJECT = packageJson.name;
            projectEnv.SENTRY_RELEASE = `${packageJson.name}@${packageJson.version}`;
            projectEnv.VITE_SENTRY_RELEASE = projectEnv.SENTRY_RELEASE;
            projectEnv.VITE_SENTRY_DIST = process.env.VERCEL_URL;
            projectEnv.VITE_SENTRY_ENVIRONMENT = "vercel-production";
            projectEnv.VITE_SENTRY_DSN = process.env.VITE_SENTRY_DSN;
          }
        }
        const projectServicePort = options?.[packageJson.name]?.servicePort;
        const projectServiceEnv: Record<string, string | undefined> = {
          ...projectEnv,
          ...(projectServicePort && { PORT: String(projectServicePort) }),
        };
        const devDependsOn = getServiceDependsOn(packageJson, "dev", options);
        const startDependsOn = [
          "build",
          ...(getServiceDependsOn(packageJson, "start", options) ?? []),
        ];
        let dockerOptions: object | undefined;
        if (isNextProject) {
          targets.build = {
            cache: true,
            command: "next build",
            options: { cwd: "{projectRoot}", env: projectServiceEnv },
            inputs: [
              "production",
              "^production",
              { externalDependencies: ["typescript", "tslib"] },
            ],
            outputs: [
              "{projectRoot}/.next",
              "!{projectRoot}/.next/dev",
              "!{projectRoot}/.next/cache",
            ],
            dependsOn: ["^build"],
          };
          targets.dev = {
            continuous: true,
            command: "next dev",
            options: { cwd: "{projectRoot}", env: projectServiceEnv },
            dependsOn: devDependsOn,
          };
          targets.start = {
            continuous: true,
            command: "next start",
            options: { cwd: "{projectRoot}", env: projectServiceEnv },
            dependsOn: startDependsOn,
          };
          dockerOptions = {
            dtsRollups,
            script: "next start",
            port: projectServicePort,
          };
        } else if (isReactRouterProject) {
          targets.build = {
            cache: true,
            command: "react-router build",
            options: { cwd: "{projectRoot}", env: projectServiceEnv },
            inputs: [
              "production",
              "^production",
              { externalDependencies: ["typescript", "tslib"] },
            ],
            outputs: [
              "{projectRoot}/build/client",
              "{projectRoot}/build/server",
            ],
            dependsOn: ["^build"],
          };
          targets.dev = {
            continuous: true,
            command: "react-router dev",
            options: { cwd: "{projectRoot}", env: projectServiceEnv },
            dependsOn: devDependsOn,
          };
          if (
            packageJson.dependencies?.serve ||
            packageJson.devDependencies?.serve
          ) {
            targets.start = {
              continuous: true,
              command: "serve -s build/client",
              options: { cwd: "{projectRoot}", env: projectServiceEnv },
              dependsOn: startDependsOn,
            };
          }
          if (packageJson.dependencies?.serve) {
            dockerOptions = {
              dtsRollups,
              script: "serve -s build/client",
              port: projectServicePort,
            };
          }
        } else {
          const buildableExports = resolveBuildableExports(
            projectRoot,
            packageJson.exports,
          );
          if (buildableExports) {
            targets.build = {
              cache: true,
              executor: `${pluginPackageJson.name}:build-typescript-project`,
              options: {
                exports: buildableExports,
                platform: packageJson.devDependencies?.["@types/node"]
                  ? "node"
                  : "neutral",
              },
              inputs: [
                "production",
                "^production",
                { externalDependencies: ["typescript", "tslib"] },
              ],
              outputs: ["{projectRoot}/dist"],
              dependsOn: ["^build"],
            };
            if (isApplicationProject && "." in buildableExports) {
              const { entryPoint } = buildableExports["."];
              if (!entryPoint.endsWith(".d.ts")) {
                targets.dev = {
                  continuous: true,
                  command: `tsx watch ${entryPoint}`,
                  options: { cwd: "{projectRoot}", env: projectServiceEnv },
                  dependsOn: devDependsOn,
                };
                targets.start = {
                  continuous: true,
                  command: `node ${getDistExport(entryPoint)}`,
                  options: { cwd: "{projectRoot}", env: projectServiceEnv },
                  dependsOn: startDependsOn,
                };
                dockerOptions = {
                  dtsRollups,
                  script: `node ${getDistExport(entryPoint)}`,
                  port: projectServicePort,
                };
              }
            }
          }
        }
        if (
          packageJson.dependencies?.["@playwright/test"] &&
          packageJson.devDependencies?.playwright
        ) {
          targets.test = {
            command: "playwright test",
            options: { cwd: "{projectRoot}", env: projectEnv },
          };
        }
        if (
          packageJson.devDependencies?.["react-email"] &&
          packageJson.devDependencies["@react-email/preview-server"]
        ) {
          const emailArgs = ["--dir", "./lib/emails"];
          const emailEnv: Record<string, string> = {};
          const emailPort = options?.[packageJson.name]?.emailPort;
          if (emailPort) {
            const port = emailPort.toString();
            emailArgs.push("--port", port);
            emailEnv.PORT = port;
          }
          targets.email = {
            continuous: true,
            command: `email dev ${emailArgs.join(" ")}`,
            options: { cwd: "{projectRoot}", env: emailEnv },
          };
        }
        if (
          isApplicationProject &&
          (process.env.GITHUB_ACTIONS === "1" || process.env.CI === "true")
        ) {
          targets["prepare-github-actions"] = {
            executor: `${pluginPackageJson.name}:prepare-github-actions`,
          };
        }
        if (dockerOptions) {
          const dockerContext = getDockerContext(packageJson.name);
          const dockerArgs = [`-t ${dockerContext}`, `dist/${dockerContext}`];
          const workspaceRootSecrets = path.join(
            context.workspaceRoot,
            ".secrets",
          );
          if (existsSync(workspaceRootSecrets)) {
            dockerArgs.push(
              `--secret id=workspace-root-secrets,type=file,src=${workspaceRootSecrets}`,
            );
          }
          const workspaceLocalSecrets = path.join(
            context.workspaceRoot,
            ".local",
            ".secrets",
          );
          if (existsSync(workspaceLocalSecrets)) {
            dockerArgs.push(
              `--secret id=workspace-local-secrets,type=file,src=${workspaceLocalSecrets}`,
            );
          }
          const projectRootSecrets = path.join(
            context.workspaceRoot,
            projectRoot,
            ".secrets",
          );
          if (existsSync(projectRootSecrets)) {
            dockerArgs.push(
              `--secret id=project-root-secrets,type=file,src=${projectRootSecrets}`,
            );
          }
          const projectLocalSecrets = path.join(
            context.workspaceRoot,
            projectRoot,
            ".local",
            ".secrets",
          );
          if (existsSync(projectLocalSecrets)) {
            dockerArgs.push(
              `--secret id=project-local-secrets,type=file,src=${projectLocalSecrets}`,
            );
          }
          targets["prepare-docker-image"] = {
            executor: `${pluginPackageJson.name}:prepare-docker-image`,
            options: dockerOptions,
          };
          targets["build-docker-image"] = {
            command: `docker build ${dockerArgs.join(" ")}`,
            dependsOn: ["prepare-docker-image"],
          };
        }
        const betterAuthOptions = options?.[packageJson.name]?.betterAuth;
        if (
          packageJson.devDependencies?.["@better-auth/cli"] &&
          betterAuthOptions
        ) {
          const { configFile, outputFile } = betterAuthOptions;
          targets["better-auth-generate"] = {
            command: `better-auth generate -y --config ${configFile} --output ${outputFile}`,
            options: { cwd: "{projectRoot}", env: { BETTER_AUTH_CLI: "1" } },
          };
        }
        const configureLocalDependenciesCommands: string[] = [];
        if (isNextProject)
          configureLocalDependenciesCommands.push("next typegen");
        else if (isReactRouterProject)
          configureLocalDependenciesCommands.push("react-router typegen");
        if (
          (isNextProject || isReactRouterProject) &&
          packageJson.devDependencies?.msw
        ) {
          configureLocalDependenciesCommands.push(
            "msw init ./public --no-save",
          );
        }
        const configureLocalServicesCommands: string[] = [];
        if (packageJson.devDependencies?.playwright) {
          const installCommand = "playwright install --with-deps";
          targets["install-playwright-deps"] = {
            command: installCommand,
            options: { cwd: "{projectRoot}", env: projectEnv },
          };
          configureLocalServicesCommands.push(installCommand);
        }
        if (
          packageJson.devDependencies?.["drizzle-kit"] &&
          existsSync(path.join(projectRoot, "drizzle.config.cjs"))
        ) {
          const generateCommand =
            "drizzle-kit generate --config ./drizzle.config.cjs";
          const migrateCommand =
            "drizzle-kit migrate --config ./drizzle.config.cjs";
          targets["drizzle-kit-generate"] = {
            command: generateCommand,
            options: { cwd: "{projectRoot}", env: projectEnv },
          };
          targets["drizzle-kit-migrate"] = {
            command: migrateCommand,
            options: { cwd: "{projectRoot}", env: projectEnv },
          };
          configureLocalServicesCommands.push(generateCommand, migrateCommand);
        }
        const sentryAuthToken =
          (projectEnv.SENTRY_AUTH_TOKEN ?? "") ||
          (process.env.SENTRY_AUTH_TOKEN ?? "");
        const sentryProject =
          (projectEnv.SENTRY_PROJECT ?? "") ||
          (process.env.SENTRY_PROJECT ?? "");
        const sentryRelease =
          (projectEnv.SENTRY_RELEASE ?? "") ||
          (process.env.SENTRY_RELEASE ?? "");
        const sentryOrg =
          (projectEnv.SENTRY_ORG ?? "") || (process.env.SENTRY_ORG ?? "");
        const sentryDsn =
          (projectEnv.SENTRY_DSN ?? "") || (process.env.SENTRY_DSN ?? "");
        if (
          sentryAuthToken &&
          sentryProject &&
          sentryRelease &&
          sentryOrg &&
          sentryDsn
        ) {
          targets["configure-sentry-release"] = {
            executor: `${pluginPackageJson.name}:configure-sentry-release`,
            options: {
              authToken: sentryAuthToken,
              org: sentryOrg,
              project: sentryProject,
              release: sentryRelease,
              dist:
                (projectEnv.SENTRY_DIST ?? "") ||
                (process.env.SENTRY_DIST ?? ""),
              git: {
                repo:
                  (projectEnv.GITHUB_REPOSITORY ?? "") ||
                  (process.env.GITHUB_REPOSITORY ?? ""),
                commit:
                  (projectEnv.GITHUB_SHA ?? "") ||
                  (process.env.GITHUB_SHA ?? ""),
              },
            },
          };
        }
        if (configureLocalDependenciesCommands.length > 0) {
          targets["configure-local-dependencies"] = {
            executor: "nx:run-commands",
            options: {
              commands: configureLocalDependenciesCommands,
              parallel: false,
              cwd: "{projectRoot}",
            },
          };
        }
        if (configureLocalServicesCommands.length > 0) {
          targets["configure-local-services"] = {
            executor: "nx:run-commands",
            options: {
              commands: configureLocalServicesCommands,
              parallel: false,
              cwd: "{projectRoot}",
              env: projectEnv,
            },
          };
        }
        if (packageJson.name === pluginPackageJson.name) {
          targets["teardown-local-services"] = {
            executor: `${pluginPackageJson.name}:teardown-local-services`,
            options: {
              stripeSecretKey: projectEnv.STRIPE_SECRET_KEY,
              stripeTestId: projectEnv.STRIPE_TEST_ID,
            },
          };
        }
        const projectFiles = await readdir(projectRoot);
        for (const projectFile of projectFiles) {
          if (
            projectFile.endsWith(".script.ts") ||
            projectFile.endsWith(".script.tsx")
          ) {
            targets[projectFile] = {
              command: `tsx ${projectFile}`,
              options: { cwd: "{projectRoot}", env: projectEnv },
            };
          }
        }
        return { projects: { [projectRoot]: { projectType, targets } } };
      },
      paths,
      options,
      context,
    ),
];
