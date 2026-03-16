import { useContext, useSyncExternalStore } from "react";

import { ChatContext } from "#./lib/chat-context.ts";

export function useChatLoading() {
	const context = useContext(ChatContext);
	if (!context)
		throw new Error("useChatLoading must be used within a ChatProvider");
	const status = useSyncExternalStore(
		context["~registerStatusCallback"],
		() => context.status,
		() => context.status,
	);
	return status === "streaming" || status === "submitted";
}
