import { useChat as useAIChat } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import type { AgentId } from "ielts-agents-api/types";
import { handleUnknownError } from "#./lib/handle-unknown-error.ts";
import { useChatContext } from "#./lib/use-chat-context.ts";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

export function useChat<T extends AgentId>({
	resume = false,
	throttle = 1000,
}: {
	resume?: boolean;
	throttle?: number;
} = {}) {
	const chat = useChatContext<T>();
	const { messages, status, sendMessage } = useAIChat({
		chat,
		resume,
		experimental_throttle: throttle,
	});
	const sendMessageMutation = useMutation({
		mutationKey: ["chat", "sendMessage"],
		mutationFn: async ({ text }: { text: string }) => {
			await sendMessage({ text });
		},
		onError: (err) => {
			handleUnknownError(err);
		},
	});
	const isLoading =
		status === "streaming" ||
		status === "submitted" ||
		sendMessageMutation.isPending;
	return {
		messages,
		status,
		isLoading,
		sendMessage: async (message: PromptInputMessage) => {
			sendMessageMutation.reset();
			await sendMessageMutation.mutateAsync({ text: message.text });
		},
	};
}
