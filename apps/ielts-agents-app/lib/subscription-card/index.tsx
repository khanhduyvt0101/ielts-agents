import type {
  ChangedPlan,
  Plan,
  PlanSchedule,
} from "ielts-agents-internal-util";
import type { ReactNode } from "react";

import type { WorkspaceData } from "#./lib/workspace-data.ts";

import { SettingsCard } from "@daveyplate/better-auth-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  formatLongDateTime,
  formatNumber,
  formatPlanLabel,
  formatShortDateTime,
  getErrorMessage,
  getNextMonthDate,
  planDefinitions,
  planKeys,
} from "ielts-agents-internal-util";
import {
  ClockIcon,
  InfoIcon,
  OctagonXIcon,
  RotateCwIcon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { DialogTrigger } from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";

import { SettingsTitle } from "#./lib/settings-title.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";

import { ChangePlanDialog } from "./change-plan-dialog.tsx";
import { createBillingCallbackURL } from "./create-billing-callback-url.ts";

function formatPlanSchedule(
  currentPlan: Plan,
  planSchedule: PlanSchedule,
): string {
  const prefix = "Your subscription will";
  const suffix = `${formatLongDateTime(planSchedule.date)}.`;
  if (planSchedule.plan.key === currentPlan.key)
    return `${prefix} switch to ${planSchedule.plan.annual ? "annual" : "monthly"} billing ${suffix}`;
  const action =
    planKeys.indexOf(planSchedule.plan.key) > planKeys.indexOf(currentPlan.key)
      ? "upgrade"
      : "downgrade";
  return `${prefix} ${action} to ${formatPlanLabel(planSchedule.plan)} ${suffix}`;
}

interface CreditBreakdownProps {
  changedPlans: ChangedPlan[];
}

function CreditBreakdown({ changedPlans }: CreditBreakdownProps) {
  const firstPlan = changedPlans[0];
  const lastPlan = changedPlans[changedPlans.length - 1];
  const resetDate = getNextMonthDate(firstPlan.time);
  if (changedPlans.length === 1) {
    const { monthlyCredits } = planDefinitions[firstPlan.key];
    return (
      <p className="text-sm">
        Your monthly credits will reset to {formatNumber(monthlyCredits)}{" "}
        {formatLongDateTime(resetDate)}.
      </p>
    );
  }
  const totalTime = resetDate.getTime() - firstPlan.time;
  const { monthlyCredits } = planDefinitions[lastPlan.key];
  return (
    <div className="space-y-2">
      <p className="text-sm">
        Your monthly credits are prorated based on the plans you&apos;ve been on
        this month and will reset to {formatNumber(monthlyCredits)}{" "}
        {formatLongDateTime(resetDate)}.
      </p>
      {changedPlans.map((plan, i) => {
        const startTime = plan.time;
        const endTime =
          i === changedPlans.length - 1
            ? resetDate.getTime()
            : changedPlans[i + 1].time;
        const duration = endTime - startTime;
        const credits = Math.round(plan.credits * (duration / totalTime));
        const percentage = ((duration / totalTime) * 100).toFixed(1);
        return (
          <div key={i} className="space-y-0.5 rounded-lg border px-2 py-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {planDefinitions[plan.key].label}
              </span>
              <span>{formatNumber(credits)} credits</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatShortDateTime(startTime)} →{" "}
                {formatShortDateTime(endTime)}
              </span>
              <span>{percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface UsageLimitProps {
  invalid: boolean;
  aggregated: number;
  used: number;
  label: ReactNode;
  info?: ReactNode;
}

function UsageLimit({
  invalid,
  aggregated,
  used,
  label,
  info,
}: UsageLimitProps) {
  const displayAggregated = invalid ? 0 : aggregated;
  const displayUsed = invalid ? 0 : used;
  const displayRemaining = Math.max(0, displayAggregated - displayUsed);
  const displayPercentage =
    displayAggregated === 0
      ? 100
      : Math.min(100, Math.round((displayUsed / displayAggregated) * 100));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {invalid ? (
          <span className="text-sm text-muted-foreground">
            {formatNumber(displayAggregated)} {label}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm">
            {formatNumber(displayAggregated)} {label}
            {info && (
              <Popover>
                <PopoverTrigger className="cursor-help rounded-full text-muted-foreground hover:text-foreground active:text-foreground">
                  <InfoIcon className="size-4" />
                </PopoverTrigger>
                <PopoverContent className="w-80">{info}</PopoverContent>
              </Popover>
            )}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatNumber(displayUsed)} used · {formatNumber(displayRemaining)}{" "}
          remaining
        </span>
      </div>
      <Progress value={displayPercentage} />
    </div>
  );
}

interface InnerProps {
  loading: boolean;
  data: WorkspaceData;
  onManageBilling: () => void;
  onUpdateSubscription: (newPlan: Plan) => void;
}

function Inner({
  loading,
  data: {
    planValidity,
    planSchedule,
    currentPlan,
    changedPlans,
    aggregatedCredits,
    usedCredits,
  },
  onManageBilling,
  onUpdateSubscription,
}: InnerProps) {
  const invalid = !planValidity;
  return (
    <div className="space-y-4 px-6">
      {invalid && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Your subscription is paused</AlertTitle>
          <AlertDescription>
            <p className="mt-1.5 mb-1.5! leading-tight sm:mt-0 sm:mb-0! sm:leading-normal">
              Please click{" "}
              <Button
                disabled={loading}
                size="xs"
                variant="destructive"
                onClick={onManageBilling}
              >
                Manage Billing
              </Button>{" "}
              and verify your billing details:
            </p>
            <ul className="list-disc sm:list-inside">
              <li>Check your payment methods</li>
              <li>Ensure sufficient funds</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {invalid ? (
          <span className="text-lg font-medium text-muted-foreground">
            {planDefinitions[currentPlan.key].label}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-lg font-medium">
            {planDefinitions[currentPlan.key].label}
            {planSchedule && (
              <Popover>
                <PopoverTrigger className="cursor-help rounded-full text-muted-foreground hover:text-foreground active:text-foreground">
                  <ClockIcon className="size-5" />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <p className="text-sm">
                    {formatPlanSchedule(currentPlan, planSchedule)}
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={loading}
            variant="outline"
            onClick={onManageBilling}
          >
            Manage Billing
          </Button>
          <ChangePlanDialog
            currentPlan={currentPlan}
            loading={loading}
            planSchedule={planSchedule}
            onUpdateSubscription={onUpdateSubscription}
          >
            <DialogTrigger asChild>
              <Button disabled={loading}>Change Plan</Button>
            </DialogTrigger>
          </ChangePlanDialog>
        </div>
      </div>
      <UsageLimit
        aggregated={aggregatedCredits}
        info={<CreditBreakdown changedPlans={changedPlans} />}
        invalid={invalid}
        label="monthly credits"
        used={usedCredits}
      />
    </div>
  );
}

export function SubscriptionCard() {
  const manageBillingMutation = useMutation(
    trpcOptions.billing.manage.mutationOptions(),
  );
  const updateBillingMutation = useMutation(
    trpcOptions.billing.update.mutationOptions(),
  );
  const loading =
    manageBillingMutation.isPending || updateBillingMutation.isPending;
  const { isPending, data, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.workspace.sync.queryOptions(),
  );
  return (
    <SettingsCard
      description="Manage your subscription details."
      disabled={loading}
      title={<SettingsTitle loading={loading}>Subscription</SettingsTitle>}
    >
      {isPending ? (
        <div className="flex items-center justify-center p-6">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="px-6">
          <Alert variant="destructive">
            <OctagonXIcon />
            <AlertTitle>Failed to load subscription</AlertTitle>
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            <AlertAction>
              <Button
                disabled={isRefetching}
                size="xs"
                variant="destructive"
                onClick={() => void refetch()}
              >
                {isRefetching ? <Spinner /> : <RotateCwIcon />}
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : (
        <Inner
          data={data}
          loading={loading}
          onManageBilling={() => {
            manageBillingMutation.mutate({
              returnURL: createBillingCallbackURL(),
            });
          }}
          onUpdateSubscription={(newPlan) => {
            updateBillingMutation.mutate({
              plan: newPlan,
              returnURL: createBillingCallbackURL(),
              succeedURL: createBillingCallbackURL("updated-subscription"),
            });
          }}
        />
      )}
    </SettingsCard>
  );
}
