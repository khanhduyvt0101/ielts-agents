import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SpinnerIcon } from "#./lib/spinner-icon.tsx";
import {
	TaskContent,
	Task as TaskElement,
	TaskTrigger,
} from "~/components/ai-elements/task";
import { cn } from "~/lib/utils";

const AUTO_CLOSE_DELAY = 1000;

interface TaskLayoutProps extends PropsWithChildren {
	isComplete: boolean;
	label: string;
	icon?: ReactNode;
}

export function Task({ label, isComplete, children, icon }: TaskLayoutProps) {
	const [isOpen, setIsOpen] = useState(!isComplete);
	const [hasAutoClosed, setHasAutoClosed] = useState(false);
	const prevCompleteRef = useRef(isComplete);

	useEffect(() => {
		const wasIncomplete = !prevCompleteRef.current;
		const justCompleted = wasIncomplete && isComplete;
		prevCompleteRef.current = isComplete;

		if (justCompleted && isOpen && !hasAutoClosed) {
			const timer = setTimeout(() => {
				setIsOpen(false);
				setHasAutoClosed(true);
			}, AUTO_CLOSE_DELAY);

			return () => {
				clearTimeout(timer);
			};
		}
	}, [isComplete, isOpen, hasAutoClosed]);

	return (
		<TaskElement open={isOpen} onOpenChange={setIsOpen}>
			<TaskTrigger title={label}>
				<div className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
					<span className="shrink-0">
						{icon ??
							(isComplete ? (
								<WrenchIcon className="size-4" />
							) : (
								<SpinnerIcon className="size-4" />
							))}
					</span>
					<p className="text-left text-sm">{label}</p>
					<ChevronDownIcon
						className={cn(
							"size-4 shrink-0 transition-transform",
							isOpen ? "rotate-180" : "rotate-0",
						)}
					/>
				</div>
			</TaskTrigger>
			<TaskContent>{children}</TaskContent>
		</TaskElement>
	);
}
