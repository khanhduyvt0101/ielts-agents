import type { PropsWithChildren } from "react";

import { DropdownMenuContent } from "~/components/ui/dropdown-menu";
import { useSidebar } from "~/components/ui/sidebar";

export function HistoryDropdownMenuContent({ children }: PropsWithChildren) {
	const { isMobile } = useSidebar();
	const props = isMobile
		? ({ align: "center", side: "bottom", sideOffset: 10 } as const)
		: ({ align: "start", side: "right", sideOffset: 8 } as const);
	return <DropdownMenuContent {...props}>{children}</DropdownMenuContent>;
}
