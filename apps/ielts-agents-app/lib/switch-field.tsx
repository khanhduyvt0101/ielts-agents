import { getErrorMessage } from "ielts-agents-internal-util";
import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import type { Except } from "type-fest";

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

export interface SwitchFieldProps
	extends Except<
		ComponentProps<typeof Switch>,
		| "id"
		| "aria-invalid"
		| "aria-labelledby"
		| "aria-describedby"
		| "onChange"
		| "onCheckedChange"
	> {
	reversed?: boolean;
	label?: ReactNode;
	description?: ReactNode;
	error?: unknown;
	onChange?: (value: boolean) => void;
}

export function SwitchField({
	className,
	style,
	reversed,
	label,
	description,
	error,
	onChange,
	...props
}: SwitchFieldProps) {
	const id = useId();
	const invalid = Boolean(error) || undefined;
	const labelId = label ? `${id}-label` : undefined;
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = invalid ? `${id}-error` : undefined;

	const nodes: ReactNode[] = [];
	if (labelId) {
		nodes.push(
			<FieldLabel key={labelId} htmlFor={id} id={labelId}>
				{label}
			</FieldLabel>,
		);
	}
	if (descriptionId) {
		nodes.push(
			<FieldDescription key={descriptionId} id={descriptionId}>
				{description}
			</FieldDescription>,
		);
	}
	if (errorId) {
		nodes.push(
			<FieldError key={errorId} id={errorId}>
				{getErrorMessage(error)}
			</FieldError>,
		);
	}

	const content =
		nodes.length > 1 ? (
			<FieldContent>{nodes}</FieldContent>
		) : nodes.length === 1 ? (
			nodes[0]
		) : undefined;

	return (
		<Field
			className={cn(reversed && "flex-row-reverse", className)}
			data-disabled={(props.disabled ?? false) || undefined}
			data-invalid={invalid}
			orientation="horizontal"
			style={style}
		>
			{content}
			<Switch
				{...props}
				aria-describedby={
					[descriptionId, errorId].filter(Boolean).join(" ") || undefined
				}
				aria-invalid={invalid}
				aria-labelledby={labelId}
				id={id}
				onCheckedChange={onChange}
			/>
		</Field>
	);
}
