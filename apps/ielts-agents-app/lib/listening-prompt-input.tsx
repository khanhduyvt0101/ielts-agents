import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";
import { InfoIcon } from "lucide-react";
import { QuestionTypeSelector } from "#./lib/question-type-selector.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputProvider,
	PromptInputSelect,
	PromptInputSelectContent,
	PromptInputSelectItem,
	PromptInputSelectTrigger,
	PromptInputSelectValue,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "~/components/ai-elements/prompt-input";
import { Spinner } from "~/components/ui/spinner";

const bandScores: BandScore[] = [
	"5.0",
	"5.5",
	"6.0",
	"6.5",
	"7.0",
	"7.5",
	"8.0",
	"8.5",
	"9.0",
];

const listeningQuestionTypes = [
	{ id: "multiple-choice", label: "Multiple Choice" },
	{ id: "matching", label: "Matching Information" },
	{ id: "form-completion", label: "Form Completion" },
	{ id: "note-completion", label: "Note Completion" },
	{ id: "table-completion", label: "Table Completion" },
	{ id: "sentence-completion", label: "Sentence Completion" },
	{ id: "summary-completion", label: "Summary Completion" },
	{ id: "short-answer", label: "Short Answer" },
	{ id: "plan-map-diagram", label: "Plan/Map/Diagram" },
	{ id: "flow-chart-completion", label: "Flow Chart Completion" },
];

const allListeningTypeIds = listeningQuestionTypes.map((t) => t.id);

interface ListeningPromptInputContentProps {
	chatId?: number;
	status?: ChatStatus;
	disabled?: boolean;
	placeholder?: string;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
	className?: string;
}

function ListeningPromptInputContent({
	chatId,
	status,
	disabled,
	placeholder = "Ask about the listening test...",
	onSubmit,
	className,
}: ListeningPromptInputContentProps) {
	const isLoading = status === "streaming" || status === "submitted";

	return (
		<PromptInput className={className} onSubmit={onSubmit}>
			{chatId != null && (
				<PromptInputHeader>
					<div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
						<InfoIcon className="size-3.5 shrink-0" />
						<span>Complete all 4 sections before submitting your test.</span>
					</div>
				</PromptInputHeader>
			)}
			<PromptInputBody>
				<PromptInputTextarea
					className="disabled:cursor-text"
					disabled={disabled ?? isLoading}
					placeholder={placeholder}
				/>
			</PromptInputBody>
			<PromptInputFooter className="flex-wrap justify-end gap-2 sm:justify-between">
				<PromptInputTools className="flex-wrap justify-end gap-2">
					<BandScoreSelector chatId={chatId} disabled={disabled ?? isLoading} />
					<QuestionTypesSelector
						chatId={chatId}
						disabled={disabled ?? isLoading}
					/>
				</PromptInputTools>
				<div className="flex items-center gap-1">
					<PromptInputSubmit
						disabled={disabled ?? isLoading}
						status={isLoading ? "submitted" : "ready"}
					/>
				</div>
			</PromptInputFooter>
		</PromptInput>
	);
}

interface ListeningPromptInputProps extends ListeningPromptInputContentProps {
	externalProvider?: boolean;
}

export function ListeningPromptInput({
	externalProvider,
	...props
}: ListeningPromptInputProps) {
	if (externalProvider) return <ListeningPromptInputContent {...props} />;

	return (
		<PromptInputProvider>
			<ListeningPromptInputContent {...props} />
		</PromptInputProvider>
	);
}

function BandScoreSelector({
	chatId,
	disabled,
}: {
	chatId?: number;
	disabled?: boolean;
}) {
	if (chatId)
		return <BandScoreSelectorWithChatId chatId={chatId} disabled={disabled} />;
	return <BandScoreSelectorWithoutChatId disabled={disabled} />;
}

function BandScoreSelectorWithChatId({
	chatId,
	disabled,
}: {
	chatId: number;
	disabled?: boolean;
}) {
	const { data, isPending } = useQuery(
		trpcOptions.listening.getListeningConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.listening.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.bandScore ?? "6.5"}
			onValueChange={(bandScore: string) => {
				updateConfig.mutate({ chatId, bandScore: bandScore as BandScore });
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Band</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{bandScores.map((score) => (
					<PromptInputSelectItem key={score} value={score}>
						Band {score}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}

function BandScoreSelectorWithoutChatId({ disabled }: { disabled?: boolean }) {
	const { data, isPending } = useQuery(
		trpcOptions.listening.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.listening.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.bandScore ?? "6.5"}
			onValueChange={(bandScore: string) => {
				updateConfig.mutate({ bandScore: bandScore as BandScore });
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Band</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{bandScores.map((score) => (
					<PromptInputSelectItem key={score} value={score}>
						Band {score}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}

function QuestionTypesSelector({
	chatId,
	disabled,
}: {
	chatId?: number;
	disabled?: boolean;
}) {
	if (chatId) {
		return (
			<QuestionTypesSelectorWithChatId chatId={chatId} disabled={disabled} />
		);
	}
	return <QuestionTypesSelectorWithoutChatId disabled={disabled} />;
}

function QuestionTypesSelectorWithChatId({
	chatId,
	disabled,
}: {
	chatId: number;
	disabled?: boolean;
}) {
	const { data, isPending } = useQuery(
		trpcOptions.listening.getListeningConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.listening.updateConfig.mutationOptions(),
	);

	const serverTypes = data?.questionTypes ?? [];
	const selected = isPending
		? []
		: serverTypes.length === 0
			? allListeningTypeIds
			: serverTypes;

	return (
		<QuestionTypeSelector
			disabled={disabled ?? isPending}
			loading={isPending}
			selected={selected}
			types={listeningQuestionTypes}
			onChange={(newTypes: string[]) => {
				const toSave =
					newTypes.length === allListeningTypeIds.length ? [] : newTypes;
				updateConfig.mutate({ chatId, questionTypes: toSave });
			}}
		/>
	);
}

function QuestionTypesSelectorWithoutChatId({
	disabled,
}: {
	disabled?: boolean;
}) {
	const { data, isPending } = useQuery(
		trpcOptions.listening.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.listening.updateConfig.mutationOptions(),
	);

	const serverTypes = data?.questionTypes ?? [];
	const selected = isPending
		? []
		: serverTypes.length === 0
			? allListeningTypeIds
			: serverTypes;

	return (
		<QuestionTypeSelector
			disabled={disabled ?? isPending}
			loading={isPending}
			selected={selected}
			types={listeningQuestionTypes}
			onChange={(newTypes: string[]) => {
				const toSave =
					newTypes.length === allListeningTypeIds.length ? [] : newTypes;
				updateConfig.mutate({ questionTypes: toSave });
			}}
		/>
	);
}
