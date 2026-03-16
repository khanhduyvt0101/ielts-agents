import type { ReactNode } from "react";

export interface ToolContainerProps {
	children: ReactNode;
}

export function ToolContainer({ children }: ToolContainerProps) {
	return (
		<div className="space-y-2">
			<div className="overflow-hidden rounded-md border bg-background">
				{children}
			</div>
		</div>
	);
}
