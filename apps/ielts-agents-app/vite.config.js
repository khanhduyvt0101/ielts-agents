import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import preserveDirectives from "rollup-preserve-directives";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const target = "es2024";

let sourcemap = false;

const plugins = [
  reactRouter(),
  tailwindcss(),
  tsconfigPaths(),
  preserveDirectives(),
];

if (
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT &&
  process.env.SENTRY_RELEASE
) {
  plugins.push(
    sentryVitePlugin({
      release: {
        dist: process.env.VITE_SENTRY_DIST,
        setCommits: {
          repo: process.env.SENTRY_GIT_REPO,
          commit: process.env.SENTRY_GIT_COMMIT,
        },
        finalize: false,
        deploy: false,
      },
      sourcemaps: { filesToDeleteAfterUpload: "build/**/*.map" },
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
        excludeReplayWorker: true,
      },
      silent: true,
      telemetry: false,
    }),
  );
  sourcemap = "hidden";
}

export default {
  clearScreen: false,
  esbuild: { target },
  build: { target, sourcemap, chunkSizeWarningLimit: 8192 },
  server: { port: 42312, strictPort: true },
  plugins,
};
