import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useSendMessage } from "#./lib/use-send-message.ts";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SuggestionsContainerProps {
	children: ReactNode;
	className?: string;
}

function SuggestionsContainer({
	children,
	className,
}: SuggestionsContainerProps) {
	return (
		<div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
	);
}

interface SuggestionButtonProps {
	suggestion: string;
	onClick?: (suggestion: string) => void;
}

function SuggestionButton({ suggestion, onClick }: SuggestionButtonProps) {
	return (
		<Button
			className="h-auto max-w-full min-w-0 cursor-pointer rounded-full px-4 py-2 text-left wrap-break-word whitespace-normal"
			size="sm"
			type="button"
			variant="outline"
			onClick={() => onClick?.(suggestion)}
		>
			{suggestion}
		</Button>
	);
}

interface SuggestionsProps {
	chatId: number;
}

export function Suggestions({ chatId }: SuggestionsProps) {
	const sendMessage = useSendMessage();
	const { data, isPending, error, isRefetching, isError, refetch } = useQuery(
		trpcOptions.chat.getSuggestions.queryOptions({ id: chatId }),
	);

	if (isPending) return null;

	if (isError) {
		return (
			<RetryErrorAlert
				error={error}
				isRefetching={isRefetching}
				refetch={refetch}
				title="Failed to load suggestions"
			/>
		);
	}

	if (data.length > 0) {
		return (
			<SuggestionsContainer>
				{data.map((suggestion, index) => (
					<SuggestionButton
						key={index}
						suggestion={suggestion}
						onClick={(text) => {
							void sendMessage({ text, files: [] });
						}}
					/>
				))}
			</SuggestionsContainer>
		);
	}
}
