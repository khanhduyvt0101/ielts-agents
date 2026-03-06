import { TRPCError } from "@trpc/server";

import { auth } from "#./lib/auth.tsx";
import { procedure } from "#./lib/procedure.ts";

export const authProcedure = procedure.use(async ({ ctx: { hono }, next }) => {
  const authData = await auth.api.getSession({ headers: hono.req.raw.headers });
  if (!authData) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: authData });
});
