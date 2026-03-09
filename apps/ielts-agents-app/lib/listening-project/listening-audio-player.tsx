import { apiURL } from "ielts-agents-internal-util";
import { PauseIcon, PlayIcon, Volume2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

interface ScriptData {
  id: number;
  sectionNumber: number;
  sectionType: string;
  title: string;
  audioUrl: string | null;
  duration: number | null;
}

interface ListeningAudioPlayerProps {
  scripts: ScriptData[];
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ListeningAudioPlayer({
  scripts,
  disabled,
}: ListeningAudioPlayerProps) {
  const [activeSection, setActiveSection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState("1");
  const audioRef = useRef<HTMLAudioElement>(null);

  const activeScript = scripts.find((s) => s.sectionNumber === activeSection);

  const audioSrc = activeScript?.audioUrl
    ? `${apiURL}/v1${activeScript.audioUrl}`
    : null;

  const handleSectionChange = useCallback((sectionNumber: number) => {
    audioRef.current?.pause();
    setActiveSection(sectionNumber);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

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
    // Auto-advance to next section
    const nextSection = activeSection + 1;
    if (
      nextSection <= 4 &&
      scripts.some((s) => s.sectionNumber === nextSection && s.audioUrl)
    )
      handleSectionChange(nextSection);
  }, [activeSection, scripts, handleSectionChange]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Section selector */}
        <div className="space-y-2">
          {scripts.map((script) => (
            <button
              key={script.sectionNumber}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                activeSection === script.sectionNumber
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50",
                !script.audioUrl && "opacity-50",
              )}
              disabled={disabled}
              type="button"
              onClick={() => {
                handleSectionChange(script.sectionNumber);
              }}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  activeSection === script.sectionNumber
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {script.sectionNumber}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{script.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {script.sectionType}
                  {script.duration ? ` · ${formatTime(script.duration)}` : ""}
                </p>
              </div>
              {!script.audioUrl && (
                <Badge className="shrink-0 text-xs" variant="outline">
                  Generating...
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Audio player */}
        {audioSrc && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- transcript available in Script tab */}
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
            <div className="flex items-center gap-3">
              <Button
                className="size-10 shrink-0"
                disabled={disabled}
                size="icon"
                variant="outline"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <PauseIcon className="size-5" />
                ) : (
                  <PlayIcon className="size-5" />
                )}
              </Button>
              <div className="flex-1 space-y-1">
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
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2Icon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Speed:</span>
                <Select
                  disabled={disabled}
                  value={playbackRate}
                  onValueChange={setPlaybackRate}
                >
                  <SelectTrigger className="h-7 w-20">
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
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!audioSrc && activeScript && (
          <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
            Audio is being generated for Section {activeSection}...
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
