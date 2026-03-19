import { useMutation } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { createSpeakingChatMutationOptions } from "#./lib/create-speaking-chat-mutation-options.ts";
import { PageHeader } from "#./lib/page-header.tsx";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { SpeakingPromptInput } from "#./lib/speaking-prompt-input.tsx";
import { SuggestionPrompts } from "#./lib/suggestion-prompts.tsx";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";
import {
	PromptInputProvider,
	usePromptInputController,
} from "~/components/ai-elements/prompt-input";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "~/components/ui/breadcrumb";

const SPEAKING_SUGGESTIONS = [
	"I want to practice a full IELTS speaking test",
	"Help me prepare for Part 2 — describing a person",
	"What tips do you have for Part 3 discussions?",
	"How can I improve my fluency score?",
];

export function clientLoader() {
	const store = getDefaultStore();
	store.set(sidebarOpenAtom, true);
}

function SpeakingContent({
	isSubmitting,
	onSubmit,
}: {
	isSubmitting: boolean;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
}) {
	const { textInput } = usePromptInputController();

	return (
		<>
			<h1 className="mb-2 text-3xl font-bold">IELTS Speaking Practice</h1>
			<p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
				Practice IELTS speaking with a live AI examiner and get coaching
				feedback
			</p>
			<div className="w-full max-w-xl">
				<SpeakingPromptInput
					externalProvider
					disabled={isSubmitting}
					placeholder="Ask your speaking coach anything..."
					onSubmit={onSubmit}
				/>
			</div>
			<SuggestionPrompts
				disabled={isSubmitting}
				suggestions={SPEAKING_SUGGESTIONS}
				onSelect={(suggestion) => {
					textInput.setInput(suggestion);
				}}
			/>
			<div className="h-28" />
		</>
	);
}

export default function Component() {
	const createMutation = useMutation(createSpeakingChatMutationOptions);
	return (
		<div className="flex h-full flex-col">
			<PageHeader>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbPage>Speaking</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</PageHeader>
			<main className="flex flex-1 flex-col items-center justify-center px-4">
				<PromptInputProvider>
					<SpeakingContent
						isSubmitting={createMutation.isPending}
						onSubmit={async (message) => {
							await createMutation.mutateAsync(message);
						}}
					/>
				</PromptInputProvider>
			</main>
		</div>
	);
}
