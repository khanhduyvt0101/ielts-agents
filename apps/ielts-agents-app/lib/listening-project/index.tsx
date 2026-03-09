import { useQuery } from "@tanstack/react-query";
import {
  FileTextIcon,
  HeadphonesIcon,
  ListChecksIcon,
  LoaderIcon,
  Volume2Icon,
} from "lucide-react";
import { useState } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";

import { ListeningAudioPlayer } from "./listening-audio-player.tsx";
import { ListeningQuestions } from "./listening-questions.tsx";
import { ListeningScript } from "./listening-script.tsx";

interface ListeningProjectProps {
  chatId: number;
}

export function ListeningProject({ chatId }: ListeningProjectProps) {
  const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.listening.getListeningData.queryOptions({ chatId }),
  );

  if (isPending) return <ListeningProjectSkeleton />;

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <RetryErrorAlert
          error={error}
          isRefetching={isRefetching}
          refetch={refetch}
          title="Failed to load listening test"
        />
      </div>
    );
  }

  return (
    <ListeningProjectContent
      bandScore={data.bandScore}
      chatId={chatId}
      questions={data.questions}
      scripts={data.scripts}
      sessions={data.sessions}
    />
  );
}

function ListeningProjectSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-2">
        <HeadphonesIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Listening Test</h2>
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
        Generating your listening test...
      </p>
    </div>
  );
}

interface ListeningProjectContentProps {
  bandScore: string;
  chatId: number;
  scripts: {
    id: number;
    sectionNumber: number;
    sectionType: string;
    title: string;
    script: string;
    audioUrl: string | null;
    duration: number | null;
  }[];
  questions: {
    id: number;
    sectionNumber: number;
    questionNumber: number;
    type: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  sessions: {
    id: number;
    score: number | null;
    totalQuestions: number | null;
    timeSpent: number | null;
    submitted: boolean;
    answers: { id: number; questionId: number; userAnswer: string }[];
  }[];
}

function ListeningProjectContent({
  bandScore,
  chatId,
  scripts,
  questions,
  sessions,
}: ListeningProjectContentProps) {
  const isLoading = useChatLoading();
  const [activeTab, setActiveTab] = useState("audio");

  const hasScripts = scripts.length > 0;
  const hasQuestions = questions.length > 0;
  const isWaiting = !hasScripts && !hasQuestions;

  const latestSession = sessions.at(0);
  const isSubmitted = latestSession?.submitted ?? false;

  if (activeTab === "script" && !isSubmitted) setActiveTab("audio");

  if (isWaiting) return <ListeningProjectSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-4">
        <HeadphonesIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Listening Test</h2>
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
            <TabsTrigger value="audio">
              <Volume2Icon className="mr-1 size-3.5" />
              Audio
            </TabsTrigger>
            {hasQuestions && (
              <TabsTrigger value="questions">
                <ListChecksIcon className="mr-1 size-3.5" />
                Questions ({questions.length})
              </TabsTrigger>
            )}
            {isSubmitted && (
              <TabsTrigger value="script">
                <FileTextIcon className="mr-1 size-3.5" />
                Transcript
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent
          forceMount
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
          value="audio"
        >
          <ListeningAudioPlayer disabled={isLoading} scripts={scripts} />
        </TabsContent>
        {hasQuestions && (
          <TabsContent
            forceMount
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="questions"
          >
            <ListeningQuestions
              chatId={chatId}
              disabled={isLoading}
              questions={questions}
              sessions={sessions}
            />
          </TabsContent>
        )}
        {isSubmitted && (
          <TabsContent
            forceMount
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="script"
          >
            <ListeningScript isSubmitted={isSubmitted} scripts={scripts} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
