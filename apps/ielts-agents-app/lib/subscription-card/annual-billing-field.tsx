import type { PlanKey } from "ielts-agents-internal-util";
import { planDefinitions } from "ielts-agents-internal-util";
import type { Except } from "type-fest";
import type { SwitchFieldProps } from "#./lib/switch-field.tsx";
import { SwitchField } from "#./lib/switch-field.tsx";
import { Badge } from "~/components/ui/badge";

function getSaving(planKey: PlanKey) {
	const { monthlyPrice, annualDiscountMonthlyPrice } = planDefinitions[planKey];
	const savings = (monthlyPrice - annualDiscountMonthlyPrice) * 12;
	return savings > 0 ? `$${savings}` : "50%";
}

export interface AnnualBillingFieldProps
	extends Except<SwitchFieldProps, "reversed" | "label" | "description"> {
	planKey: PlanKey;
}

export function AnnualBillingField({
	planKey,
	...props
}: AnnualBillingFieldProps) {
	return (
		<SwitchField
			{...props}
			reversed
			label={
				<span className="flex flex-wrap items-center gap-1.5">
					<Badge>Save {getSaving(planKey)}</Badge>
					with annual billing
				</span>
			}
		/>
	);
}
