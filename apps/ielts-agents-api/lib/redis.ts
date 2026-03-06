import { createClient } from "redis";

import { isBetterAuthCLI } from "#./lib/is-better-auth-cli.ts";

export const redis = createClient({
  url: (process.env.REDIS_URL ?? "") || "redis://localhost:6379",
});

if (!isBetterAuthCLI) await redis.connect();
