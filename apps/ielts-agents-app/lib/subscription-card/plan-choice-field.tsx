import type { PlanKey } from "ielts-agents-internal-util";
import {
	formatNumber,
	getErrorMessage,
	isPlanKey,
	planDefinitions,
	planKeys,
} from "ielts-agents-internal-util";
import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import type { Except } from "type-fest";

import { Badge } from "~/components/ui/badge";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

function renderBadge(planKey: PlanKey) {
	switch (planKey) {
		case "basic": {
			return <Badge variant="outline">Most popular</Badge>;
		}
		case "elite": {
			return <Badge>Best value</Badge>;
		}
	}
}

export interface PlanChoiceFieldProps
	extends Except<
		ComponentProps<typeof RadioGroup>,
		"aria-labelledby" | "aria-describedby" | "onChange" | "onValueChange"
	> {
	planAnnual?: boolean;
	label?: ReactNode;
	description?: ReactNode;
	error?: unknown;
	onChange?: (value: PlanKey) => void;
}

export function PlanChoiceField({
	className,
	style,
	planAnnual,
	label,
	description,
	error,
	onChange,
	...props
}: PlanChoiceFieldProps) {
	const id = useId();
	const labelId = label ? `${id}-label` : undefined;
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = error ? `${id}-error` : undefined;

	return (
		<FieldSet className={className} style={style}>
			{labelId && (
				<FieldLegend id={labelId} variant="label">
					{label}
				</FieldLegend>
			)}
			{descriptionId && (
				<FieldDescription id={descriptionId}>{description}</FieldDescription>
			)}
			<RadioGroup
				{...props}
				aria-describedby={
					[descriptionId, errorId].filter(Boolean).join(" ") || undefined
				}
				aria-labelledby={labelId}
				onValueChange={(value) => {
					if (isPlanKey(value)) onChange?.(value);
				}}
			>
				{planKeys.map((planKey) => {
					const definition = planDefinitions[planKey];
					const price = planAnnual
						? definition.annualDiscountMonthlyPrice * 12
						: definition.monthlyPrice;
					const disabled = (props.disabled ?? false) || undefined;
					return (
						<FieldLabel key={planKey}>
							<Field data-disabled={disabled} orientation="horizontal">
								<RadioGroupItem
									className="self-center"
									disabled={disabled}
									value={planKey}
								/>
								<FieldContent className="gap-2 sm:flex-row sm:items-center sm:justify-between">
									<div className="space-y-1">
										<FieldTitle className="gap-1.5">
											<span className="text-base/5">{definition.label}</span>
											{renderBadge(planKey)}
										</FieldTitle>
										<FieldDescription>
											{formatNumber(definition.monthlyCredits)} monthly credits
										</FieldDescription>
									</div>
									<div className="sm:text-right">
										<div>
											<span className="text-2xl leading-none font-bold group-data-[disabled=true]/field:opacity-50">
												${price}
											</span>
											<span className="text-sm leading-none font-normal text-muted-foreground">
												{planAnnual ? "/year" : "/mo"}
											</span>
										</div>
										<div>
											<span className="text-xs leading-none font-normal text-muted-foreground">
												{planKey === "free"
													? "forever"
													: `billed ${planAnnual ? "annually" : "monthly"}`}
											</span>
										</div>
									</div>
								</FieldContent>
							</Field>
						</FieldLabel>
					);
				})}
			</RadioGroup>
			{errorId && (
				<FieldError id={errorId}>{getErrorMessage(error)}</FieldError>
			)}
		</FieldSet>
	);
}
