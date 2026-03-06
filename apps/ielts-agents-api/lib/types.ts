import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { router } from "#./lib/router/index.ts";

export type TRPCRouter = typeof router;

export type ServerInputs = inferRouterInputs<TRPCRouter>;

export type ServerOutputs = inferRouterOutputs<TRPCRouter>;

export type * from "#./lib/agent-id.ts";
export type * from "#./lib/agent-message.ts";
export type * from "#./lib/agent-message-part.ts";
export type * from "#./lib/agent-tool-part.ts";
export type * from "#./lib/agents.ts";
export type * from "#./lib/band-score.ts";
export type * from "#./lib/chat-tools.ts";
export type * from "#./lib/ielts-agents-message.ts";
export type * from "#./lib/ielts-agents-message-part.ts";
export type * from "#./lib/ielts-agents-reasoning-part.ts";
export type * from "#./lib/ielts-agents-text-part.ts";
export type * from "#./lib/ielts-agents-tool-part.ts";
