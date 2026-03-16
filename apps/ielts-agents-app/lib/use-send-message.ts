import { useCallback, useContext } from "react";
import { ChatContext } from "#./lib/chat-context.ts";
import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

export function useSendMessage() {
	const context = useContext(ChatContext);
	if (!context)
		throw new Error("useSendMessage must be used within a ChatProvider");
	const sendMessage = useCallback(
		async (message: PromptInputMessage) => {
			dispatchEvent(new ScrollToBottomConversationEvent());
			await context.sendMessage(message);
		},
		[context],
	);
	return sendMessage;
}
