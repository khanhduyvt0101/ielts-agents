import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";
import { useAtomValue } from "jotai";
import { speakingRealtimeStatusAtom } from "#./lib/speaking-realtime-status-atom.ts";
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

const testParts = [
	{ value: "full-test", label: "Full Test" },
	{ value: "part-1", label: "Part 1 - Interview" },
	{ value: "part-2", label: "Part 2 - Long Turn" },
	{ value: "part-3", label: "Part 3 - Discussion" },
];

interface SpeakingPromptInputContentProps {
	chatId?: number;
	status?: ChatStatus;
	disabled?: boolean;
	placeholder?: string;
	onSubmit: (message: PromptInputMessage) => Promise<void> | void;
	className?: string;
}

function SpeakingPromptInputContent({
	chatId,
	status,
	disabled,
	placeholder = "Ask your speaking coach anything...",
	onSubmit,
	className,
}: SpeakingPromptInputContentProps) {
	const realtimeStatus = useAtomValue(speakingRealtimeStatusAtom);
	const isRealtimeActive =
		realtimeStatus === "connecting" || realtimeStatus === "active";
	const isLoading = status === "streaming" || status === "submitted";

	const isDisabled = (disabled ?? isLoading) || isRealtimeActive;

	return (
		<PromptInput className={className} onSubmit={onSubmit}>
			<PromptInputBody>
				<PromptInputTextarea
					className="disabled:cursor-text"
					disabled={isDisabled}
					placeholder={
						isRealtimeActive ? "Speaking session in progress..." : placeholder
					}
				/>
			</PromptInputBody>
			<PromptInputFooter className="flex-wrap justify-end gap-2 sm:justify-between">
				<PromptInputTools className="flex-wrap justify-end gap-2">
					<BandScoreSelector chatId={chatId} disabled={isDisabled} />
					<TestPartSelector chatId={chatId} disabled={isDisabled} />
				</PromptInputTools>
				<div className="flex items-center gap-1">
					<PromptInputSubmit
						disabled={isDisabled}
						status={isLoading ? "submitted" : "ready"}
					/>
				</div>
			</PromptInputFooter>
		</PromptInput>
	);
}

interface SpeakingPromptInputProps extends SpeakingPromptInputContentProps {
	externalProvider?: boolean;
}

export function SpeakingPromptInput({
	externalProvider,
	...props
}: SpeakingPromptInputProps) {
	if (externalProvider) return <SpeakingPromptInputContent {...props} />;

	return (
		<PromptInputProvider>
			<SpeakingPromptInputContent {...props} />
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
		trpcOptions.speaking.getSpeakingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.speaking.updateConfig.mutationOptions(),
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
		trpcOptions.speaking.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.speaking.updateConfig.mutationOptions(),
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

function TestPartSelector({
	chatId,
	disabled,
}: {
	chatId?: number;
	disabled?: boolean;
}) {
	if (chatId)
		return <TestPartSelectorWithChatId chatId={chatId} disabled={disabled} />;
	return <TestPartSelectorWithoutChatId disabled={disabled} />;
}

function TestPartSelectorWithChatId({
	chatId,
	disabled,
}: {
	chatId: number;
	disabled?: boolean;
}) {
	const { data, isPending } = useQuery(
		trpcOptions.speaking.getSpeakingConfig.queryOptions({ chatId }),
	);
	const updateConfig = useMutation(
		trpcOptions.speaking.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.testPart ?? "full-test"}
			onValueChange={(testPart: string) => {
				updateConfig.mutate({
					chatId,
					testPart: testPart as "part-1" | "part-2" | "part-3" | "full-test",
				});
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Part</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{testParts.map((t) => (
					<PromptInputSelectItem key={t.value} value={t.value}>
						{t.label}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}

function TestPartSelectorWithoutChatId({ disabled }: { disabled?: boolean }) {
	const { data, isPending } = useQuery(
		trpcOptions.speaking.getDefaultConfig.queryOptions(),
	);
	const updateConfig = useMutation(
		trpcOptions.speaking.updateConfig.mutationOptions(),
	);

	return (
		<PromptInputSelect
			disabled={disabled ?? isPending}
			value={data?.testPart ?? "full-test"}
			onValueChange={(testPart: string) => {
				updateConfig.mutate({
					testPart: testPart as "part-1" | "part-2" | "part-3" | "full-test",
				});
			}}
		>
			<PromptInputSelectTrigger className="w-auto gap-1">
				{isPending ? (
					<>
						<Spinner />
						<span>Part</span>
					</>
				) : (
					<PromptInputSelectValue />
				)}
			</PromptInputSelectTrigger>
			<PromptInputSelectContent>
				{testParts.map((t) => (
					<PromptInputSelectItem key={t.value} value={t.value}>
						{t.label}
					</PromptInputSelectItem>
				))}
			</PromptInputSelectContent>
		</PromptInputSelect>
	);
}
