export interface Plan {
	key: PlanKey;
	annual: boolean;
}

export type PlanKey = "free" | "basic" | "elite" | "ultimate";

export interface PlanDefinition {
	label: string;
	monthlyCredits: number;
	monthlyPrice: number;
	annualDiscountMonthlyPrice: number;
}

export interface PlanSchedule {
	plan: Plan;
	date: Date;
}

export interface ChangedPlan {
	key: PlanKey;
	time: number;
	credits: number;
}

export const planDefinitions: Record<PlanKey, PlanDefinition> = {
	free: {
		label: "Free",
		monthlyCredits: 200,
		monthlyPrice: 0,
		annualDiscountMonthlyPrice: 0,
	},
	basic: {
		label: "Basic",
		monthlyCredits: 10_000,
		monthlyPrice: 30,
		annualDiscountMonthlyPrice: 15,
	},
	elite: {
		label: "Elite",
		monthlyCredits: 20_000,
		monthlyPrice: 60,
		annualDiscountMonthlyPrice: 30,
	},
	ultimate: {
		label: "Ultimate",
		monthlyCredits: 30_000,
		monthlyPrice: 90,
		annualDiscountMonthlyPrice: 45,
	},
};

export const planKeys = Object.keys(planDefinitions) as [PlanKey, ...PlanKey[]];

export function isPlanKey(value: string): value is PlanKey {
	return planKeys.includes(value as PlanKey);
}

export function formatPlanLabel(plan: Plan): string {
	const parts: string[] = ["the", planDefinitions[plan.key].label];
	if (plan.key !== "free") parts.push(plan.annual ? "annual" : "monthly");
	parts.push("plan");
	return parts.join(" ");
}
