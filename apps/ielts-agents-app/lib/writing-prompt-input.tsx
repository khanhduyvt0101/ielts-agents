import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";
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

const taskTypes = [
	{ value: "task-1", label: "Task 1 - Visual Data" },
	{ value: "task-2", label: "Task 2 - Essay" },
];

interface WritingPromptInputContentProps {
	chatId?: number;
	status?: ChatStatus;
	disabled?: boolean;
	placeholder?: string;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
	className?: string;
}

function WritingPromptInputContent({
	chatId,
	status,
	disabled,
	placeholder = "Ask about the writing task...",
	onSubmit,
	className,
}: WritingPromptInputContentProps) {
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
					<TaskTypeSelector chatId={chatId} disabled={disabled ?? isLoading} />
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

interface WritingPromptInputProps extends WritingPromptInputContentProps {
	externalProvider?: boolean;
}

export function WritingPromptInput({
	externalProvider,
	...props
}: WritingPromptInputProps) {
	if (externalProvider) return <WritingPromptInputContent {...props} />;

	return (
		<PromptInputProvider>
			<WritingPromptInputContent {...props} />
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
		trpcOptions.writing.getWritingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.writing.updateConfig.mutationOptions(),
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
		trpcOptions.writing.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.writing.updateConfig.mutationOptions(),
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

function TaskTypeSelector({
	chatId,
	disabled,
}: {
	chatId?: number;
	disabled?: boolean;
}) {
	if (chatId)
		return <TaskTypeSelectorWithChatId chatId={chatId} disabled={disabled} />;
	return <TaskTypeSelectorWithoutChatId disabled={disabled} />;
}

function TaskTypeSelectorWithChatId({
	chatId,
	disabled,
}: {
	chatId: number;
	disabled?: boolean;
}) {
	const { data, isPending } = useQuery(
		trpcOptions.writing.getWritingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.writing.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.taskType ?? "task-2"}
			onValueChange={(taskType: string) => {
				updateConfig.mutate({
					chatId,
					taskType: taskType as "task-1" | "task-2",
				});
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Task</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{taskTypes.map((t) => (
					<PromptInputSelectItem key={t.value} value={t.value}>
						{t.label}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}

function TaskTypeSelectorWithoutChatId({ disabled }: { disabled?: boolean }) {
	const { data, isPending } = useQuery(
		trpcOptions.writing.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.writing.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.taskType ?? "task-2"}
			onValueChange={(taskType: string) => {
				updateConfig.mutate({
					taskType: taskType as "task-1" | "task-2",
				});
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Task</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{taskTypes.map((t) => (
					<PromptInputSelectItem key={t.value} value={t.value}>
						{t.label}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}
