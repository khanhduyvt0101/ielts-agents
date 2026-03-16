import type { PropsWithChildren } from "react";

import { SidebarTrigger } from "~/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

export function PageHeader({ children }: PropsWithChildren) {
	return (
		<div className="flex h-16 shrink-0 items-center gap-3 px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center gap-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger />
					</TooltipTrigger>
					<TooltipContent align="start">Toggle Sidebar</TooltipContent>
				</Tooltip>
				{children}
			</div>
		</div>
	);
}
