import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { SpeakingAudioVisualizer } from "#./lib/speaking-audio-visualizer.tsx";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

interface TranscriptEntry {
	role: string;
	text: string;
	timestamp: number;
}

type SpeakingStatus = "idle" | "connecting" | "active" | "ending" | "ended";

interface SpeakingSessionPanelProps {
	status: SpeakingStatus;
	transcript: TranscriptEntry[];
	duration: number;
	isAgentSpeaking: boolean;
	onConnect: () => void;
	onDisconnect: () => void;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

const statusLabels: Record<SpeakingStatus, string> = {
	idle: "Ready to start",
	connecting: "Connecting...",
	active: "Speaking test in progress",
	ending: "Ending session...",
	ended: "Session ended",
};

export function SpeakingSessionPanel({
	status,
	transcript,
	duration,
	isAgentSpeaking,
	onConnect,
	onDisconnect,
}: SpeakingSessionPanelProps) {
	const isActive = status === "active";
	const isIdle = status === "idle";
	const isEnded = status === "ended";
	const isConnecting = status === "connecting";

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2">
					{isActive ? (
						<MicIcon className="size-4 text-green-500" />
					) : (
						<MicOffIcon className="size-4 text-muted-foreground" />
					)}
					<span className="text-sm font-medium">{statusLabels[status]}</span>
				</div>
				{isActive && (
					<span className="font-mono text-sm text-muted-foreground">
						{formatDuration(duration)}
					</span>
				)}
			</div>

			{/* Audio visualizer */}
			{isActive && (
				<div className="flex shrink-0 items-center justify-center border-b px-4 py-3">
					<SpeakingAudioVisualizer
						className="w-full max-w-xs"
						isActive={isActive}
					/>
					{isAgentSpeaking && (
						<span className="ml-2 text-xs text-muted-foreground">
							Examiner speaking...
						</span>
					)}
				</div>
			)}

			{/* Live transcript */}
			<ScrollArea className="min-h-0 flex-1 p-4">
				<div className="space-y-3">
					{transcript.map((entry, index) => (
						<div key={index} className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-muted-foreground uppercase">
									{entry.role === "examiner" ? "Examiner" : "You"}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{formatDuration(Math.floor(entry.timestamp / 1000))}
								</span>
							</div>
							<p className="text-sm">{entry.text}</p>
						</div>
					))}
					{transcript.length === 0 && isActive && (
						<p className="text-center text-sm text-muted-foreground">
							Waiting for the examiner to begin...
						</p>
					)}
				</div>
			</ScrollArea>

			{/* Controls */}
			<div className="flex shrink-0 items-center justify-center gap-3 border-t px-4 py-3">
				{(isIdle || isEnded) && (
					<Button className="gap-2" onClick={onConnect}>
						<MicIcon className="size-4" />
						{isEnded ? "Start New Session" : "Start Speaking Test"}
					</Button>
				)}
				{isConnecting && (
					<Button disabled className="gap-2">
						<MicIcon className="size-4 animate-pulse" />
						Connecting...
					</Button>
				)}
				{isActive && (
					<Button
						className="gap-2"
						variant="destructive"
						onClick={onDisconnect}
					>
						<PhoneOffIcon className="size-4" />
						End Session
					</Button>
				)}
			</div>
		</div>
	);
}
