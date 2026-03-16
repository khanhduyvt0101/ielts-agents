import { initTRPC } from "@trpc/server";
import type { Context } from "hono";
import type { BlankEnv, BlankInput } from "hono/types";
import { SuperJSON } from "superjson";

export const trpc = initTRPC
	.context<{ hono: Context<BlankEnv, "/v1/trpc/*", BlankInput> }>()
	.create({ transformer: SuperJSON });
