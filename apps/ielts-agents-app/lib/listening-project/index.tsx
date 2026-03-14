import { useQuery } from "@tanstack/react-query";
import { BookAIcon, HeadphonesIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";

import { ListeningAudioPlayer } from "./listening-audio-player.tsx";
import { ListeningQuestions } from "./listening-questions.tsx";
import { ListeningScript } from "./listening-script.tsx";
import { ListeningVocabulary } from "./listening-vocabulary.tsx";

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
      vocabulary={data.vocabulary}
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
    scriptQuote: string | null;
    distractors: { text: string; explanation: string }[];
    paraphrase: { questionPhrase: string; scriptPhrase: string } | null;
  }[];
  sessions: {
    id: number;
    score: number | null;
    totalQuestions: number | null;
    timeSpent: number | null;
    submitted: boolean;
    answers: { id: number; questionId: number; userAnswer: string }[];
  }[];
  vocabulary: {
    id: number;
    word: string;
    definition: string;
    exampleUsage: string;
    ieltsRelevance: string;
  }[];
}

function ListeningProjectContent({
  bandScore,
  chatId,
  scripts,
  questions,
  sessions,
  vocabulary,
}: ListeningProjectContentProps) {
  const isLoading = useChatLoading();

  const hasScripts = scripts.length > 0;
  const hasQuestions = questions.length > 0;
  const hasVocabulary = vocabulary.length > 0;
  const isWaiting = !hasScripts && !hasQuestions;

  // Determine available sections from scripts
  const sectionNumbers = scripts.map((s) => s.sectionNumber);
  const firstSectionTab =
    sectionNumbers.length > 0 ? `section-${sectionNumbers[0]}` : "section-1";

  const [activeTab, setActiveTab] = useState(firstSectionTab);

  // Reset to first available section tab if current tab is no longer available
  if (activeTab === "vocabulary" && !hasVocabulary) setActiveTab(firstSectionTab);
  if (
    activeTab.startsWith("section-") &&
    sectionNumbers.length > 0 &&
    !sectionNumbers.includes(Number(activeTab.replace("section-", "")))
  )
    setActiveTab(firstSectionTab);

  const latestSession = sessions.at(0);
  const isSubmitted = latestSession?.submitted ?? false;

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
            {sectionNumbers.map((num) => (
              <TabsTrigger key={num} value={`section-${num}`}>
                Section {num}
              </TabsTrigger>
            ))}
            {hasVocabulary && (
              <TabsTrigger value="vocabulary">
                <BookAIcon className="mr-1 size-3.5" />
                Vocab ({vocabulary.length})
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {sectionNumbers.map((num) => {
          const script = scripts.find((s) => s.sectionNumber === num);
          const sectionQuestions = questions.filter(
            (q) => q.sectionNumber === num,
          );
          const sectionScript = scripts.filter((s) => s.sectionNumber === num);

          return (
            <TabsContent
              key={num}
              forceMount
              className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              value={`section-${num}`}
            >
              {/* Section title + audio player sticky at top */}
              <div className="shrink-0">
                {script && (
                  <div className="border-b px-4 py-2">
                    <p className="text-sm font-semibold">{script.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {script.sectionType}
                    </p>
                  </div>
                )}
                <ListeningAudioPlayer
                  disabled={isLoading}
                  script={script ?? null}
                />
              </div>

              {/* Scrollable questions below */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {sectionQuestions.length > 0 && (
                  <ListeningQuestions
                    chatId={chatId}
                    disabled={isLoading}
                    firstSectionNumber={sectionNumbers[0]}
                    questions={sectionQuestions}
                    sectionNumber={num}
                    sessions={sessions}
                    totalQuestions={questions}
                  />
                )}

                {isSubmitted && sectionScript.length > 0 && (
                  <ListeningScript
                    isSubmitted={isSubmitted}
                    questions={sectionQuestions}
                    scripts={sectionScript}
                  />
                )}
              </div>
            </TabsContent>
          );
        })}

        {hasVocabulary && (
          <TabsContent
            forceMount
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="vocabulary"
          >
            <ListeningVocabulary disabled={isLoading} vocabulary={vocabulary} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
