import { useAtom } from "jotai";
import type { PropsWithChildren } from "react";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

import { MainSidebar } from "./main-sidebar.tsx";

export function MainLayout({ children }: PropsWithChildren) {
	const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);

	return (
		<SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
			<MainSidebar />
			<SidebarInset className="h-screen overflow-hidden">
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
