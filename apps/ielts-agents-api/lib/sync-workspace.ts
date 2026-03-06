import { eq } from "drizzle-orm";
import { getNextMonthDate, isLive } from "ielts-agents-internal-util";

import { database } from "#./lib/database.ts";
import { getMonthlyCredits } from "#./lib/get-monthly-credits.ts";
import { getPlanDetailsForStripeCustomerId } from "#./lib/get-plan-details-for-stripe-customer-id.ts";
import { workspace } from "#./lib/schema/index.ts";
import { syncWorkspaceColumns } from "#./lib/sync-workspace-columns.ts";
import { WorkspaceNotFoundError } from "#./lib/workspace-not-found-error.ts";

type SyncWorkspaceOptions = (
  | {
      workspaceData: Pick<
        typeof workspace.$inferSelect,
        keyof typeof syncWorkspaceColumns
      >;
    }
  | { stripeCustomerId: string }
  | { userId: string }
) & { disableCache?: boolean };

export async function syncWorkspace(options: SyncWorkspaceOptions) {
  const workspaceData =
    "workspaceData" in options
      ? options.workspaceData
      : await database.query.workspace.findFirst({
          where:
            "stripeCustomerId" in options
              ? eq(workspace.stripeCustomerId, options.stripeCustomerId)
              : eq(workspace.userId, options.userId),
          columns: syncWorkspaceColumns,
        });
  if (!workspaceData) throw new WorkspaceNotFoundError();
  const [currentPlan, planSchedule, currentSubscription] =
    await getPlanDetailsForStripeCustomerId(workspaceData.stripeCustomerId, {
      disableCache: (options.disableCache ?? false) || !isLive,
    });
  const firstPlan = workspaceData.changedPlans[0];
  const lastPlan =
    workspaceData.changedPlans[workspaceData.changedPlans.length - 1];
  let shouldUpdateWorkspace = false;
  const shouldResetCreditsAt = getNextMonthDate(firstPlan.time);
  const monthlyCredits = getMonthlyCredits(currentPlan.key);
  const now = new Date();
  if (
    shouldResetCreditsAt < now ||
    (lastPlan.key === "free" && currentPlan.key !== "free")
  ) {
    shouldUpdateWorkspace = true;
    workspaceData.changedPlans = [
      {
        key: currentPlan.key,
        time:
          lastPlan.key === currentPlan.key
            ? shouldResetCreditsAt.getTime()
            : now.getTime(),
        credits: monthlyCredits,
      },
    ];
    workspaceData.aggregatedCredits = monthlyCredits;
    workspaceData.usedCredits = 0;
  } else if (lastPlan.key !== currentPlan.key) {
    shouldUpdateWorkspace = true;
    workspaceData.changedPlans.push({
      key: currentPlan.key,
      time: now.getTime(),
      credits: monthlyCredits,
    });
    const totalTime = shouldResetCreditsAt.getTime() - firstPlan.time;
    workspaceData.aggregatedCredits = 0;
    for (let i = 0; i < workspaceData.changedPlans.length; i++) {
      const startTime = workspaceData.changedPlans[i].time;
      const endTime =
        i === workspaceData.changedPlans.length - 1
          ? shouldResetCreditsAt.getTime()
          : workspaceData.changedPlans[i + 1].time;
      workspaceData.aggregatedCredits += Math.round(
        workspaceData.changedPlans[i].credits *
          ((endTime - startTime) / totalTime),
      );
    }
    workspaceData.usedCredits = Math.min(
      workspaceData.aggregatedCredits,
      workspaceData.usedCredits,
    );
  }
  if (shouldUpdateWorkspace) {
    await database
      .update(workspace)
      .set({
        changedPlans: workspaceData.changedPlans,
        aggregatedCredits: workspaceData.aggregatedCredits,
        usedCredits: workspaceData.usedCredits,
      })
      .where(eq(workspace.id, workspaceData.id));
  }
  return {
    ...workspaceData,
    currentPlan,
    planSchedule,
    planValidity:
      currentPlan.key === "free" || currentSubscription?.status === "active",
  };
}
