import { useMutation } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { createWritingChatMutationOptions } from "#./lib/create-writing-chat-mutation-options.ts";
import { PageHeader } from "#./lib/page-header.tsx";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { SuggestionPrompts } from "#./lib/suggestion-prompts.tsx";
import { WritingPromptInput } from "#./lib/writing-prompt-input.tsx";
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

const WRITING_SUGGESTIONS = [
	"Some people believe technology has made our lives more complex. Discuss both views and give your opinion.",
	"The bar chart shows the percentage of households with internet access in five countries between 2000 and 2020.",
	"Universities should focus on practical skills rather than theoretical knowledge. To what extent do you agree?",
	"The diagram below shows the process of recycling plastic bottles. Summarise the information.",
];

export function clientLoader() {
	const store = getDefaultStore();
	store.set(sidebarOpenAtom, true);
}

function WritingContent({
	isSubmitting,
	onSubmit,
}: {
	isSubmitting: boolean;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
}) {
	const { textInput } = usePromptInputController();

	return (
		<>
			<h1 className="mb-2 text-3xl font-bold">IELTS Writing Task Generator</h1>
			<p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
				Generate practice IELTS writing tasks and get AI-powered feedback
			</p>
			<div className="w-full max-w-xl">
				<WritingPromptInput
					externalProvider
					disabled={isSubmitting}
					placeholder="Describe the topic for your IELTS writing task..."
					onSubmit={onSubmit}
				/>
			</div>
			<SuggestionPrompts
				disabled={isSubmitting}
				suggestions={WRITING_SUGGESTIONS}
				onSelect={(suggestion) => {
					textInput.setInput(suggestion);
				}}
			/>
			<div className="h-28" />
		</>
	);
}

export default function Component() {
	const createMutation = useMutation(createWritingChatMutationOptions);
	return (
		<div className="flex h-full flex-col">
			<PageHeader>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbPage>Writing</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</PageHeader>
			<main className="flex flex-1 flex-col items-center justify-center px-4">
				<PromptInputProvider>
					<WritingContent
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
