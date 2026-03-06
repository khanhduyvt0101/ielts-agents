import type { authClient } from "#./lib/auth-client.ts";

export type SessionData = typeof authClient.$Infer.Session;
