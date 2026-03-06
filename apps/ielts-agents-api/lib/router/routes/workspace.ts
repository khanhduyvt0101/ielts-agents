import { z } from "zod";

import { authProcedure } from "#./lib/auth-procedure.ts";
import { syncWorkspace } from "#./lib/sync-workspace.ts";

export const sync = authProcedure
  .input(z.object({ disableCache: z.boolean().optional() }).optional())
  .query(async ({ ctx: { user }, input }) => {
    const {
      aggregatedCredits,
      usedCredits,
      changedPlans,
      currentPlan,
      planSchedule,
      planValidity,
    } = await syncWorkspace({ ...input, userId: user.id });
    return {
      aggregatedCredits,
      usedCredits,
      changedPlans,
      currentPlan,
      planSchedule,
      planValidity,
    };
  });
