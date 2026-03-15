import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";

import { queryClient } from "#./lib/query-client.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useSendMessage } from "#./lib/use-send-message.ts";

interface WritingEssayProps {
  chatId: number;
  disabled: boolean;
  latestEssay: {
    id: number;
    content: string;
    wordCount: number;
    timeSpent: number | null;
    submitted: boolean;
  } | null;
  task: {
    requirements: { wordCount: number; timeLimit: number };
  };
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function WritingEssay({
  chatId,
  disabled,
  latestEssay,
  task,
}: WritingEssayProps) {
  const isSubmitted = latestEssay?.submitted ?? false;
  const targetWordCount = task.requirements.wordCount;

  const [content, setContent] = useState(latestEssay?.content ?? "");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wordCount = countWords(content);
  const progress = Math.min(100, (wordCount / targetWordCount) * 100);

  const { mutateAsync, isPending } = useMutation(
    trpcOptions.writing.submitEssay.mutationOptions(),
  );
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (isSubmitted) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted]);

  const handleSubmit = useCallback(async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await mutateAsync({
        chatId,
        content,
        wordCount,
        timeSpent: elapsedSeconds,
      });
      await queryClient.invalidateQueries(
        trpcOptions.writing.getWritingData.queryOptions({ chatId }),
      );
      void sendMessage({
        text: "I just submitted my essay. Please evaluate it and give me detailed feedback on all 4 IELTS criteria.",
        files: [],
      });
    } catch {
      // Restart the timer if submission failed
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  }, [chatId, content, wordCount, elapsedSeconds, mutateAsync, sendMessage]);

  const wordCountVariant =
    wordCount < targetWordCount / 2
      ? "destructive"
      : wordCount < targetWordCount
        ? "secondary"
        : "default";

  if (isSubmitted && latestEssay) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Badge>Submitted</Badge>
            <Badge variant="outline">{latestEssay.wordCount} words</Badge>
            {latestEssay.timeSpent != null && (
              <Badge variant="outline">
                {formatTime(latestEssay.timeSpent)}
              </Badge>
            )}
          </div>
          <Textarea
            readOnly
            className="min-h-[400px] bg-muted/50 font-serif"
            value={latestEssay.content}
          />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={wordCountVariant}>
              {wordCount}/{targetWordCount} words
            </Badge>
            <Badge variant="outline">{formatTime(elapsedSeconds)}</Badge>
          </div>
        </div>

        <Progress className="h-2" value={progress} />

        <Textarea
          className="min-h-[400px] font-serif"
          disabled={disabled || isPending}
          placeholder="Start writing your essay here..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
        />

        <div className="flex justify-end">
          <Button
            disabled={
              disabled ||
              isPending ||
              wordCount < Math.floor(targetWordCount / 2)
            }
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isPending ? "Submitting..." : "Submit Essay"}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
