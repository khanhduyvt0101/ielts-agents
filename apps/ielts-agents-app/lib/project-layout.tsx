import { useAtom } from "jotai";
import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { projectOpenAtom } from "#./lib/project-open-atom.ts";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

interface ProjectLayoutProps {
	chatPanel: ReactNode;
	projectPanel: ReactNode;
	chatHeader: ReactNode;
}

export function ProjectLayout({
	chatHeader,
	chatPanel,
	projectPanel,
}: ProjectLayoutProps) {
	const [projectOpen] = useAtom(projectOpenAtom);
	const isMobile = useIsMobile();

	const containerRef = useRef<HTMLDivElement>(null);
	const [projectWidth, setProjectWidth] = useState(() => {
		try {
			const saved = localStorage.getItem("project-panel-width");
			return saved ? Number(saved) : 70;
		} catch {
			return 70;
		}
	});
	const [isDragging, setIsDragging] = useState(false);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!containerRef.current) return;
			const containerRect = containerRef.current.getBoundingClientRect();
			const newProjectWidth =
				((containerRect.right - moveEvent.clientX) / containerRect.width) * 100;
			setProjectWidth(Math.max(25, Math.min(80, newProjectWidth)));
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			setProjectWidth((w) => {
				localStorage.setItem("project-panel-width", String(w));
				return w;
			});
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	}, []);

	if (!projectPanel) {
		return (
			<div className="flex h-full flex-col overflow-hidden">
				{chatHeader}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{chatPanel}
				</div>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="flex h-full flex-col overflow-hidden">
				{chatHeader}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{chatPanel}
				</div>
				<MobileProjectSheet>{projectPanel}</MobileProjectSheet>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="flex h-full overflow-hidden">
			<div
				className={cn(
					"flex min-h-0 flex-col overflow-hidden",
					!isDragging && "transition-[flex] duration-200 ease-linear",
				)}
				style={{ flex: projectOpen ? 100 - projectWidth : 100 }}
			>
				{chatHeader}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{chatPanel}
				</div>
			</div>

			<button
				aria-label="Resize panels"
				className={cn(
					"relative flex w-px cursor-col-resize items-center justify-center bg-border transition-opacity duration-200 ease-linear",
					"after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
					projectOpen ? "opacity-100" : "pointer-events-none opacity-0",
				)}
				type="button"
				onMouseDown={handleMouseDown}
			>
				<div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
					<GripVerticalIcon className="size-2.5" />
				</div>
			</button>

			<div
				className={cn(
					"flex min-h-0 flex-col overflow-hidden border-l bg-sidebar text-sidebar-foreground",
					!isDragging && "transition-[flex,opacity] duration-200 ease-linear",
					projectOpen ? "opacity-100" : "opacity-0",
				)}
				style={{ flex: projectOpen ? projectWidth : 0 }}
			>
				<div className="h-full overflow-hidden">{projectPanel}</div>
			</div>
		</div>
	);
}

function MobileProjectSheet({ children }: { children: ReactNode }) {
	const [projectOpen, setProjectOpen] = useAtom(projectOpenAtom);

	return (
		<Sheet open={projectOpen} onOpenChange={setProjectOpen}>
			<SheetContent
				className="flex w-full flex-col sm:max-w-lg"
				showCloseButton={false}
				side="right"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>Project Panel</SheetTitle>
					<SheetDescription>Panel</SheetDescription>
				</SheetHeader>
				<div className="flex-1 overflow-hidden bg-sidebar p-4 text-sidebar-foreground">
					{children}
				</div>
			</SheetContent>
		</Sheet>
	);
}
