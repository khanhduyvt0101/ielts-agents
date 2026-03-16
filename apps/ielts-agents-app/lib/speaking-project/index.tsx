import { useQuery } from "@tanstack/react-query";
import { LoaderIcon, MicIcon } from "lucide-react";
import { useState } from "react";
import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { SpeakingRecorder } from "#./lib/speaking-speech-button.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { SpeakingEvaluation } from "./speaking-evaluation.tsx";
import { SpeakingTranscript } from "./speaking-transcript.tsx";

interface SpeakingProjectProps {
	chatId: number;
}

export function SpeakingProject({ chatId }: SpeakingProjectProps) {
	const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
		trpcOptions.speaking.getSpeakingData.queryOptions({ chatId }),
	);

	if (isPending) return <SpeakingProjectSkeleton />;

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<RetryErrorAlert
					error={error}
					isRefetching={isRefetching}
					refetch={refetch}
					title="Failed to load speaking test"
				/>
			</div>
		);
	}

	return (
		<SpeakingProjectContent
			bandScore={data.bandScore}
			transcripts={data.transcripts}
		/>
	);
}

function SpeakingProjectSkeleton() {
	return (
		<div className="flex h-full flex-col p-4">
			<div className="mb-4 flex items-center gap-2">
				<MicIcon className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold">Speaking Test</h2>
			</div>
			<div className="space-y-4">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
		</div>
	);
}

interface TranscriptData {
	id: number;
	testPart: string;
	transcript: { role: string; text: string; timestamp: number }[];
	duration: number | null;
	cueCardTopic: string | null;
	evaluation: {
		fluencyCoherence: string;
		lexicalResource: string;
		grammaticalRange: string;
		pronunciation: string;
		overallBand: string;
		feedback: {
			criterion: string;
			score: string;
			comments: string;
			strengths: string[];
			improvements: string[];
		}[];
		corrections: {
			original: string;
			corrected: string;
			explanation: string;
			type: string;
		}[];
		modelPhrases: string[];
		improvedResponses: {
			original: string;
			improved: string;
			explanation: string;
		}[];
	} | null;
}

interface SpeakingProjectContentProps {
	bandScore: string;
	transcripts: TranscriptData[];
}

function SpeakingProjectContent({
	bandScore,
	transcripts,
}: SpeakingProjectContentProps) {
	const isLoading = useChatLoading();
	const hasTranscripts = transcripts.length > 0;
	const latestTranscript = hasTranscripts
		? transcripts[transcripts.length - 1]
		: null;
	const hasEvaluation = !!latestTranscript?.evaluation;

	const defaultTab = hasEvaluation
		? "evaluation"
		: hasTranscripts
			? "transcript"
			: "record";
	const [activeTab, setActiveTab] = useState(defaultTab);

	const [trackedEvaluation, setTrackedEvaluation] = useState(hasEvaluation);
	if (hasEvaluation && !trackedEvaluation) {
		setTrackedEvaluation(true);
		setActiveTab("evaluation");
	}
	if (!hasEvaluation && trackedEvaluation) setTrackedEvaluation(false);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex shrink-0 items-center gap-2 px-4 pt-4">
				<MicIcon className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold">Speaking Test</h2>
				<span className="text-xs text-muted-foreground">Band {bandScore}</span>
				{isLoading && (
					<span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
						<LoaderIcon className="size-3 animate-spin" />
						Processing...
					</span>
				)}
			</div>

			<Tabs
				className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
				value={activeTab}
				onValueChange={setActiveTab}
			>
				<div className="shrink-0 px-4">
					<TabsList>
						<TabsTrigger value="record">Record</TabsTrigger>
						{hasTranscripts && (
							<TabsTrigger value="transcript">Transcript</TabsTrigger>
						)}
						{hasEvaluation && (
							<TabsTrigger value="evaluation">Evaluation</TabsTrigger>
						)}
					</TabsList>
				</div>
				<TabsContent
					forceMount
					className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
					value="record"
				>
					<SpeakingRecorder />
				</TabsContent>
				{hasTranscripts && (
					<TabsContent
						forceMount
						className="min-h-0 flex-1 data-[state=inactive]:hidden"
						value="transcript"
					>
						<div className="h-full overflow-auto">
							{transcripts.map((t) => (
								<SpeakingTranscript
									key={t.id}
									cueCardTopic={t.cueCardTopic}
									duration={t.duration}
									testPart={t.testPart}
									transcript={t.transcript}
								/>
							))}
						</div>
					</TabsContent>
				)}
				{latestTranscript?.evaluation && (
					<TabsContent
						forceMount
						className="min-h-0 flex-1 data-[state=inactive]:hidden"
						value="evaluation"
					>
						<SpeakingEvaluation evaluation={latestTranscript.evaluation} />
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}
