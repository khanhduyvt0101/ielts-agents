import { useQuery } from "@tanstack/react-query";
import { LoaderIcon, PenLineIcon } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";

import { WritingEssay } from "./writing-essay.tsx";
import { WritingEvaluation } from "./writing-evaluation.tsx";
import { WritingTask } from "./writing-task.tsx";

interface WritingProjectProps {
  chatId: number;
}

export function WritingProject({ chatId }: WritingProjectProps) {
  const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.writing.getWritingData.queryOptions({ chatId }),
  );

  if (isPending) return <WritingProjectSkeleton />;

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <RetryErrorAlert
          error={error}
          isRefetching={isRefetching}
          refetch={refetch}
          title="Failed to load writing test"
        />
      </div>
    );
  }

  return (
    <WritingProjectContent
      bandScore={data.bandScore}
      chatId={chatId}
      essays={data.essays}
      task={data.task}
    />
  );
}

function WritingProjectSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center gap-2">
        <PenLineIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Writing Test</h2>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Generating your writing task...
      </p>
    </div>
  );
}

interface WritingProjectContentProps {
  bandScore: string;
  chatId: number;
  task: {
    taskType: string;
    prompt: string;
    visualDescription: string | null;
    chartData: {
      type: "bar" | "line" | "pie" | "table";
      title: string;
      data: Record<string, string | number>[];
      xKey: string;
      dataKeys: { key: string; label: string }[];
    } | null;
    requirements: { wordCount: number; timeLimit: number };
    difficulty: string;
  } | null;
  essays: {
    id: number;
    content: string;
    wordCount: number;
    timeSpent: number | null;
    submitted: boolean;
    evaluation: {
      taskAchievement: string;
      coherenceCohesion: string;
      lexicalResource: string;
      grammaticalRange: string;
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
      improvedParagraphs: {
        original: string;
        improved: string;
        explanation: string;
      }[];
    } | null;
  }[];
}

function WritingProjectContent({
  bandScore,
  chatId,
  task,
  essays,
}: WritingProjectContentProps) {
  const isLoading = useChatLoading();
  const [activeTab, setActiveTab] = useState("task");

  const hasTask = !!task;
  const latestEssay = essays.length > 0 ? essays[0] : null;
  const hasEvaluation = !!latestEssay?.evaluation;

  const [trackedEvaluation, setTrackedEvaluation] = useState(hasEvaluation);
  if (hasEvaluation && !trackedEvaluation) {
    setTrackedEvaluation(true);
    setActiveTab("evaluation");
  }
  if (!hasEvaluation && trackedEvaluation) setTrackedEvaluation(false);

  if (!hasTask) return <WritingProjectSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-4">
        <PenLineIcon className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Writing Test</h2>
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
            <TabsTrigger value="task">Task</TabsTrigger>
            <TabsTrigger value="essay">Essay</TabsTrigger>
            {hasEvaluation && (
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent
          forceMount
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
          value="task"
        >
          <WritingTask task={task} />
        </TabsContent>
        <TabsContent
          forceMount
          className="min-h-0 flex-1 data-[state=inactive]:hidden"
          value="essay"
        >
          <WritingEssay
            chatId={chatId}
            disabled={isLoading}
            latestEssay={latestEssay}
            task={task}
          />
        </TabsContent>
        {latestEssay?.evaluation && (
          <TabsContent
            forceMount
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="evaluation"
          >
            <WritingEvaluation evaluation={latestEssay.evaluation} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
