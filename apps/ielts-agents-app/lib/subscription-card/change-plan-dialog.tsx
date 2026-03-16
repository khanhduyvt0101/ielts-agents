import { useForm } from "@mantine/form";
import type { Plan, PlanSchedule } from "ielts-agents-internal-util";
import {
	formatLongDateTime,
	formatPlanLabel,
} from "ielts-agents-internal-util";
import { InfoIcon, RefreshCcwIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";

import { AnnualBillingField } from "./annual-billing-field.tsx";
import { PlanChoiceField } from "./plan-choice-field.tsx";

function formatPlanDetails(
	currentPlan: Plan,
	planSchedule: PlanSchedule | undefined,
) {
	const planDescription = `You are on ${formatPlanLabel(currentPlan)}`;
	if (!planSchedule) return `${planDescription}.`;
	return `${planDescription} and will switch to ${formatPlanLabel(planSchedule.plan)} ${formatLongDateTime(planSchedule.date)}.`;
}

type InitialValues = Plan;

type FinalValues = InitialValues;

type TransformValues = (values: InitialValues) => FinalValues;

interface InnerProps {
	loading: boolean;
	planSchedule: PlanSchedule | undefined;
	currentPlan: Plan;
	onUpdateSubscription: (newPlan: Plan) => void;
}

function Inner({
	loading,
	planSchedule,
	currentPlan,
	onUpdateSubscription,
}: InnerProps) {
	const initialPlan = planSchedule?.plan ?? currentPlan;
	const form = useForm<InitialValues, TransformValues>({
		initialValues: { ...initialPlan, annual: true },
		transformValues: (values) =>
			values.key === "free"
				? { key: "free", annual: false }
				: { key: values.key, annual: values.annual },
	});
	const pending = loading || form.submitting;
	return (
		<form
			className="contents"
			onReset={form.onReset}
			onSubmit={form.onSubmit((newPlan) => {
				const samePlan =
					newPlan.key === initialPlan.key &&
					(newPlan.key === "free" || newPlan.annual === initialPlan.annual);
				if (samePlan) toast.error("Plan is the same");
				else onUpdateSubscription(newPlan);
			})}
		>
			<DialogHeader>
				<DialogTitle>Change Plan</DialogTitle>
				<DialogDescription>You can switch plans at any time.</DialogDescription>
			</DialogHeader>
			<Alert>
				<InfoIcon />
				<AlertTitle>Current Plan</AlertTitle>
				<AlertDescription>
					{formatPlanDetails(currentPlan, planSchedule)}
				</AlertDescription>
			</Alert>
			<PlanChoiceField
				{...form.getInputProps("key")}
				key={form.key("key")}
				description="Choose a plan that fits your needs."
				disabled={pending}
				label="New Plan"
				planAnnual={form.values.annual}
			/>
			<AnnualBillingField
				{...form.getInputProps("annual", { type: "checkbox" })}
				key={form.key("annual")}
				disabled={pending}
				planKey={form.values.key}
			/>
			<DialogFooter>
				<Button disabled={pending} type="submit">
					{pending ? <Spinner /> : <RefreshCcwIcon />}
					Update Subscription
				</Button>
			</DialogFooter>
		</form>
	);
}

export type ChangePlanDialogProps = ComponentProps<typeof Dialog> & InnerProps;

export function ChangePlanDialog({
	loading,
	planSchedule,
	currentPlan,
	onUpdateSubscription,
	children,
	...props
}: ChangePlanDialogProps) {
	return (
		<Dialog {...props}>
			{children}
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
				<Inner
					currentPlan={currentPlan}
					loading={loading}
					planSchedule={planSchedule}
					onUpdateSubscription={onUpdateSubscription}
				/>
			</DialogContent>
		</Dialog>
	);
}
