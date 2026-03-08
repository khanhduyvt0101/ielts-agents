import { useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { BookOpenIcon, MessageCircleIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIsMobile } from "~/hooks/use-mobile";

import { projectOpenAtom } from "#./lib/project-open-atom.ts";
import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChat } from "#./lib/use-chat.ts";

import { ReadingPassage } from "./reading-passage.tsx";
import { ReadingQuestions } from "./reading-questions.tsx";

interface ReadingProjectProps {
  chatId: number;
}

export function ReadingProject({ chatId }: ReadingProjectProps) {
  const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.reading.getReadingData.queryOptions({ chatId }),
  );

  if (isPending) return <ReadingProjectSkeleton />;

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <RetryErrorAlert
          error={error}
          isRefetching={isRefetching}
          refetch={refetch}
          title="Failed to load reading test"
        />
      </div>
    );
  }

  return (
    <ReadingProjectContent
      bandScore={data.bandScore}
      passage={data.passage}
      questions={data.questions}
    />
  );
}

function ReadingProjectSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-2">
        <BookOpenIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Reading Test</h2>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Generating your reading test...
      </p>
    </div>
  );
}

interface ReadingProjectContentProps {
  bandScore: string;
  passage: {
    title: string;
    content: string;
  } | null;
  questions: {
    id: number;
    questionNumber: number;
    type: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

function ReadingProjectContent({
  bandScore,
  passage,
  questions,
}: ReadingProjectContentProps) {
  const { sendMessage } = useChat({ resume: true });
  const isMobile = useIsMobile();
  const setProjectOpen = useSetAtom(projectOpenAtom);

  const handleAskAI = useCallback(
    (question: string) => {
      void sendMessage({ text: question, files: [] });
      if (isMobile) setProjectOpen(false);
    },
    [sendMessage, isMobile, setProjectOpen],
  );

  const hasPassage = !!passage;
  const hasQuestions = questions.length > 0;
  const isWaiting = !hasPassage && !hasQuestions;
  const hasPassageOnly = hasPassage && !hasQuestions;

  if (isWaiting) return <ReadingProjectSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Reading Test</h2>
          <span className="text-xs text-muted-foreground">
            Band {bandScore}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (isMobile) setProjectOpen(false);
            else setProjectOpen((prev) => !prev);
          }}
        >
          <MessageCircleIcon className="size-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      </div>

      {hasPassageOnly ? (
        <div className="flex-1 overflow-hidden">
          <ReadingPassage passage={passage} />
        </div>
      ) : (
        <Tabs
          className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
          defaultValue="passage"
        >
          <div className="shrink-0 px-4">
            <TabsList>
              <TabsTrigger value="passage">Passage</TabsTrigger>
              <TabsTrigger value="questions">
                Questions{hasQuestions ? ` (${questions.length})` : ""}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            className="min-h-0 flex-1 overflow-hidden"
            value="passage"
          >
            {passage && <ReadingPassage passage={passage} />}
          </TabsContent>
          <TabsContent
            className="min-h-0 flex-1 overflow-hidden"
            value="questions"
          >
            {hasQuestions && (
              <ReadingQuestions questions={questions} onAskAI={handleAskAI} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
