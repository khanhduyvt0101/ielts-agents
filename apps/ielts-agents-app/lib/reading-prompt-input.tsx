import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";
import { QuestionTypeSelector } from "#./lib/question-type-selector.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
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

const readingQuestionTypes = [
	{ id: "true-false-not-given", label: "True/False/Not Given" },
	{ id: "yes-no-not-given", label: "Yes/No/Not Given" },
	{ id: "multiple-choice", label: "Multiple Choice" },
	{ id: "matching-headings", label: "Matching Headings" },
	{ id: "fill-in-the-blank", label: "Fill in the Blank" },
	{ id: "sentence-completion", label: "Sentence Completion" },
	{ id: "summary-completion", label: "Summary Completion" },
	{ id: "table-completion", label: "Table Completion" },
];

const allReadingTypeIds = readingQuestionTypes.map((t) => t.id);

interface ReadingPromptInputContentProps {
	chatId?: number;
	status?: ChatStatus;
	disabled?: boolean;
	placeholder?: string;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
	className?: string;
}

function ReadingPromptInputContent({
	chatId,
	status,
	disabled,
	placeholder = "Ask about the reading test...",
	onSubmit,
	className,
}: ReadingPromptInputContentProps) {
	const isLoading = status === "streaming" || status === "submitted";

	return (
		<PromptInput className={className} onSubmit={onSubmit}>
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

interface ReadingPromptInputProps extends ReadingPromptInputContentProps {
	externalProvider?: boolean;
}

export function ReadingPromptInput({
	externalProvider,
	...props
}: ReadingPromptInputProps) {
	if (externalProvider) return <ReadingPromptInputContent {...props} />;

	return (
		<PromptInputProvider>
			<ReadingPromptInputContent {...props} />
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
		trpcOptions.reading.getReadingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.reading.updateConfig.mutationOptions(),
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
		trpcOptions.reading.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.reading.updateConfig.mutationOptions(),
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
		trpcOptions.reading.getReadingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.reading.updateConfig.mutationOptions(),
	);

	// When loading: pass empty selected so no checkmarks show
	const serverTypes = data?.questionTypes ?? [];
	const selected = isPending
		? []
		: serverTypes.length === 0
			? allReadingTypeIds
			: serverTypes;

	return (
		<QuestionTypeSelector
			disabled={disabled ?? isPending}
			loading={isPending}
			selected={selected}
			types={readingQuestionTypes}
			onChange={(newTypes: string[]) => {
				const toSave =
					newTypes.length === allReadingTypeIds.length ? [] : newTypes;
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
		trpcOptions.reading.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.reading.updateConfig.mutationOptions(),
	);

	const serverTypes = data?.questionTypes ?? [];
	const selected = isPending
		? []
		: serverTypes.length === 0
			? allReadingTypeIds
			: serverTypes;

	return (
		<QuestionTypeSelector
			disabled={disabled ?? isPending}
			loading={isPending}
			selected={selected}
			types={readingQuestionTypes}
			onChange={(newTypes: string[]) => {
				const toSave =
					newTypes.length === allReadingTypeIds.length ? [] : newTypes;
				updateConfig.mutate({ questionTypes: toSave });
			}}
		/>
	);
}
