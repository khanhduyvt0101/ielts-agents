import type { PropsWithChildren } from "react";

import { SpinnerIcon } from "#./lib/spinner-icon.tsx";

export interface ToolIconProps extends PropsWithChildren {
	isComplete: boolean;
}

export function ToolIcon({ isComplete, children }: ToolIconProps) {
	if (!isComplete) return <SpinnerIcon className="size-4" />;
	return children;
}
