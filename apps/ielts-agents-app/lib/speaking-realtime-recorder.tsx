import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { handleUnknownError } from "#./lib/handle-unknown-error.ts";
import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import { speakingRealtimeStatusAtom } from "#./lib/speaking-realtime-status-atom.ts";
import { SpeakingSessionPanel } from "#./lib/speaking-session-panel.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatContext } from "#./lib/use-chat-context.ts";
import { useSpeakingRealtime } from "#./lib/use-speaking-realtime.ts";

interface SpeakingRealtimeRecorderProps {
	chatId: number;
}

export function SpeakingRealtimeRecorder({
	chatId,
}: SpeakingRealtimeRecorderProps) {
	const chat = useChatContext();
	const { sendMessage } = useChat({ chat });
	const setRealtimeStatus = useSetAtom(speakingRealtimeStatusAtom);

	const submitTranscript = useMutation(
		trpcOptions.speaking.submitTranscript.mutationOptions(),
	);

	const { data: speakingConfig } = useQuery(
		trpcOptions.speaking.getSpeakingConfig.queryOptions({ chatId }),
	);

	// Use refs to avoid stale closures in the WebSocket close handler
	const sendMessageRef = useRef(sendMessage);
	sendMessageRef.current = sendMessage;
	const speakingConfigRef = useRef(speakingConfig);
	speakingConfigRef.current = speakingConfig;

	const onSessionEnd = useCallback(
		(
			transcript: { role: string; text: string; timestamp: number }[],
			duration: number,
		) => {
			if (transcript.length === 0) return;

			const testPart = speakingConfigRef.current?.testPart ?? "part-1";
			const validTestPart = testPart === "full-test" ? "part-1" : testPart;

			submitTranscript.mutate(
				{
					chatId,
					testPart: validTestPart as "part-1" | "part-2" | "part-3",
					transcript,
					duration,
				},
				{
					onSuccess: () => {
						const transcriptSummary = transcript
							.map(
								(entry) =>
									`${entry.role === "examiner" ? "Examiner" : "Candidate"}: ${entry.text}`,
							)
							.join("\n");

						void sendMessageRef.current({
							text: `I just finished my speaking test. Here is the transcript from the session:\n\n${transcriptSummary}\n\nPlease review my performance and give me detailed feedback with band scores.`,
						});
						dispatchEvent(new ScrollToBottomConversationEvent());
					},
					onError: (error) => {
						handleUnknownError(error);
					},
				},
			);
		},
		[chatId, submitTranscript.mutate],
	);

	const { status, connect, disconnect, transcript, duration, isAgentSpeaking } =
		useSpeakingRealtime({ chatId, onSessionEnd });

	useEffect(() => {
		setRealtimeStatus(status);
		return () => setRealtimeStatus("idle");
	}, [status, setRealtimeStatus]);

	return (
		<SpeakingSessionPanel
			duration={duration}
			isAgentSpeaking={isAgentSpeaking}
			status={status}
			transcript={transcript}
			onConnect={() => void connect()}
			onDisconnect={disconnect}
		/>
	);
}
