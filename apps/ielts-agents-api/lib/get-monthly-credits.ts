import type { PlanKey } from "ielts-agents-internal-util";

import { planDefinitions } from "ielts-agents-internal-util";

export function getMonthlyCredits(planKey: PlanKey) {
	const { monthlyCredits } = planDefinitions[planKey];
	return monthlyCredits;
}
