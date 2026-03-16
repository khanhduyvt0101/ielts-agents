import { apiURL } from "ielts-agents-internal-util";
import { PauseIcon, PlayIcon, Volume2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";

interface ScriptData {
	id: number;
	sectionNumber: number;
	sectionType: string;
	title: string;
	audioUrl: string | null;
	duration: number | null;
}

interface ListeningAudioPlayerProps {
	script: ScriptData | null;
	disabled?: boolean;
}

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ListeningAudioPlayer({
	script,
	disabled,
}: ListeningAudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [playbackRate, setPlaybackRate] = useState("1");
	const audioRef = useRef<HTMLAudioElement>(null);

	const audioSrc = script?.audioUrl ? `${apiURL}/v1${script.audioUrl}` : null;

	useEffect(() => {
		if (audioRef.current) audioRef.current.playbackRate = Number(playbackRate);
	}, [playbackRate]);

	const togglePlay = useCallback(() => {
		const audio = audioRef.current;
		if (!audio || !audioSrc) return;
		if (isPlaying) audio.pause();
		else void audio.play();
	}, [isPlaying, audioSrc]);

	const handleTimeUpdate = useCallback(() => {
		if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
	}, []);

	const handleLoadedMetadata = useCallback(() => {
		if (audioRef.current) setDuration(audioRef.current.duration);
	}, []);

	const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const time = Number(e.target.value);
		if (audioRef.current) {
			audioRef.current.currentTime = time;
			setCurrentTime(time);
		}
	}, []);

	const handleEnded = useCallback(() => {
		setIsPlaying(false);
	}, []);

	if (!script) {
		return (
			<div className="border-b bg-card px-4 py-3 text-center text-sm text-muted-foreground">
				No audio available for this section.
			</div>
		);
	}

	return (
		<div className="border-b bg-card px-4 py-3">
			{audioSrc ? (
				<div className="flex items-center gap-3">
					<audio
						ref={audioRef}
						src={audioSrc}
						onEnded={handleEnded}
						onLoadedMetadata={handleLoadedMetadata}
						onPause={() => {
							setIsPlaying(false);
						}}
						onPlay={() => {
							setIsPlaying(true);
						}}
						onTimeUpdate={handleTimeUpdate}
					/>
					<Button
						className="size-9 shrink-0"
						disabled={disabled}
						size="icon"
						variant="outline"
						onClick={togglePlay}
					>
						{isPlaying ? (
							<PauseIcon className="size-4" />
						) : (
							<PlayIcon className="size-4" />
						)}
					</Button>
					<div className="min-w-0 flex-1 space-y-0.5">
						<input
							className="w-full cursor-pointer accent-primary"
							disabled={disabled}
							max={duration || 0}
							min={0}
							step={0.1}
							type="range"
							value={currentTime}
							onChange={handleSeek}
						/>
						<div className="flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								{formatTime(currentTime)} / {formatTime(duration)}
							</span>
							<div className="flex items-center gap-1.5">
								<Volume2Icon className="size-3.5 text-muted-foreground" />
								<Select
									disabled={disabled}
									value={playbackRate}
									onValueChange={setPlaybackRate}
								>
									<SelectTrigger className="h-6 w-16 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0.75">0.75x</SelectItem>
										<SelectItem value="1">1x</SelectItem>
										<SelectItem value="1.25">1.25x</SelectItem>
										<SelectItem value="1.5">1.5x</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
						{script.sectionNumber}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{script.title}</p>
						<p className="text-xs text-muted-foreground capitalize">
							{script.sectionType}
						</p>
					</div>
					<Badge className="shrink-0 text-xs" variant="outline">
						Generating...
					</Badge>
				</div>
			)}
		</div>
	);
}
