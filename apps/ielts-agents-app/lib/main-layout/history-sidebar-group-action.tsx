import { SidebarGroupAction } from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";

import { useChatList } from "./use-chat-list.ts";

export function HistorySidebarGroupAction() {
	const { isRefetching } = useChatList();
	return isRefetching ? (
		<SidebarGroupAction
			disabled
			className="disabled:pointer-events-none disabled:opacity-50"
		>
			<Spinner />
			<span className="sr-only">Reload Chats</span>
		</SidebarGroupAction>
	) : undefined;
}
