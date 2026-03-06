import { trpcMiddleware } from "@sentry/node";

import { trpc } from "#./lib/trpc.ts";

export const procedure = trpc.procedure.use(trpc.middleware(trpcMiddleware()));
