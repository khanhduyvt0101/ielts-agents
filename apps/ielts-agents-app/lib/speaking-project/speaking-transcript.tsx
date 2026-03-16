import { ScrollArea } from "~/components/ui/scroll-area";

interface TranscriptEntry {
  role: string;
  text: string;
  timestamp: number;
}

interface SpeakingTranscriptProps {
  testPart: string;
  transcript: TranscriptEntry[];
  duration: number | null;
  cueCardTopic: string | null;
}

export function SpeakingTranscript({
  testPart,
  transcript,
  duration,
  cueCardTopic,
}: SpeakingTranscriptProps) {
  const partLabel =
    testPart === "part-1"
      ? "Part 1 — Interview"
      : testPart === "part-2"
        ? "Part 2 — Long Turn"
        : "Part 3 — Discussion";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{partLabel}</span>
          {duration != null && (
            <span className="text-xs text-muted-foreground">
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
            </span>
          )}
        </div>
        {cueCardTopic && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            Cue card: {cueCardTopic}
          </p>
        )}
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {transcript.map((entry, index) => (
            <div key={index} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {entry.role === "examiner" ? "Examiner" : "Candidate"}
              </span>
              <p className="text-sm">{entry.text}</p>
            </div>
          ))}
          {transcript.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No transcript recorded yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
