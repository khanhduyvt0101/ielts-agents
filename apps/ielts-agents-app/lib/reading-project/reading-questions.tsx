import { useMutation } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  LightbulbIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";
import { useSendMessage } from "#./lib/use-send-message.ts";

import { AskAIDialog } from "./ask-ai-dialog.tsx";

interface QuestionData {
  id: number;
  questionNumber: number;
  type: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  linearthinking: string;
  passageQuote: string | null;
  distractors: { text: string; explanation: string }[];
  paraphrase: { questionPhrase: string; passagePhrase: string } | null;
  tableData: {
    title: string;
    columnHeaders: string[];
    rows: { header: string; cells: string[] }[];
  } | null;
}

interface SessionData {
  id: number;
  score: number | null;
  totalQuestions: number | null;
  timeSpent: number | null;
  submitted: boolean;
  answers: { id: number; questionId: number; userAnswer: string }[];
}

interface QuestionGroup {
  type: string;
  questions: QuestionData[];
}

interface ReadingQuestionsProps {
  chatId: number;
  questions: QuestionData[];
  sessions: SessionData[];
  disabled?: boolean;
}

const questionTypeLabels: Record<string, string> = {
  "true-false-not-given": "True / False / Not Given",
  "yes-no-not-given": "Yes / No / Not Given",
  "multiple-choice": "Multiple Choice",
  "fill-in-the-blank": "Fill in the Blank",
  "matching-headings": "Matching Headings",
  "sentence-completion": "Sentence Completion",
  "summary-completion": "Summary Completion",
  "table-completion": "Table Completion",
};

const questionTypeInstructions: Record<string, string> = {
  "true-false-not-given":
    "Do the following statements agree with the information given in the passage? Write **TRUE**, **FALSE**, or **NOT GIVEN**.",
  "yes-no-not-given":
    "Do the following statements agree with the claims of the writer? Write **YES**, **NO**, or **NOT GIVEN**.",
  "multiple-choice": "Choose the correct letter, **A**, **B**, **C** or **D**.",
  "fill-in-the-blank":
    "Complete the sentences below. Choose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the passage for each answer.",
  "sentence-completion":
    "Complete the sentences below. Choose **NO MORE THAN THREE WORDS** from the passage for each answer.",
  "summary-completion":
    "Complete the summary below. Choose **ONE WORD ONLY** from the passage for each answer.",
  "matching-headings":
    "Choose the correct heading for each section from the list of headings below.",
  "table-completion":
    "Complete the table below. Choose **NO MORE THAN TWO WORDS** from the passage for each answer.",
};

const strategyTips: Partial<Record<string, string[]>> = {
  "true-false-not-given": [
    "Focus on whether the passage STATES the information, not whether it's logically true.",
    "\"Not Given\" means the passage doesn't mention it at all \u2014 don't assume.",
    'Watch for absolute words like "always", "never", "all" \u2014 they\'re often False.',
    "Find the exact sentence in the passage before deciding. Don't rely on general knowledge.",
  ],
  "yes-no-not-given": [
    "This tests the WRITER'S OPINION, not facts. Look for what the author claims or believes.",
    '"Yes" = the writer agrees with the statement. "No" = the writer disagrees.',
    '"Not Given" = the writer doesn\'t express a view on this specific point.',
    "Look for opinion markers: 'I believe', 'it is argued that', 'the evidence suggests'.",
  ],
  "multiple-choice": [
    "Read all options before choosing \u2014 eliminate obviously wrong answers first.",
    "The correct answer is often a paraphrase of the passage, not the exact words.",
    "Watch for distractors that use words from the passage but change the meaning.",
    "If two options seem correct, look for the one that is more specifically supported.",
  ],
  "fill-in-the-blank": [
    "Answers usually come directly from the passage \u2014 look for exact words.",
    "Check the word limit carefully (e.g., 'NO MORE THAN TWO WORDS').",
    "Read the sentence with your answer to make sure it's grammatically correct.",
    "Scan for synonyms of key words in the question to locate the right paragraph.",
  ],
  "matching-headings": [
    "Read each paragraph and identify the MAIN IDEA before looking at the headings.",
    "Don't match based on a single word \u2014 the heading must capture the whole paragraph.",
    "Some headings are distractors and won't match any paragraph.",
    "Start with the paragraphs you're most confident about to narrow down options.",
  ],
  "sentence-completion": [
    "Find the relevant section in the passage that discusses the sentence topic.",
    "The answer must complete the sentence grammatically and meaningfully.",
    "Words usually come directly from the passage \u2014 don't paraphrase.",
    "Pay attention to the word limit specified in the instructions.",
  ],
  "summary-completion": [
    "Read the entire summary first to understand the overall meaning.",
    "If given a word bank, eliminate options as you use them.",
    "The summary follows the same order as the relevant section of the passage.",
    "Check that each completed sentence makes grammatical sense.",
  ],
  "table-completion": [
    "Read column and row headings to understand the table structure.",
    "Predict the type of information needed for each blank.",
    "Answers follow the order of the passage \u2014 work through row by row.",
    "Keep within the word limit specified.",
  ],
};

function groupQuestionsByType(questions: QuestionData[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  for (const question of questions) {
    const lastGroup = groups.at(-1);
    if (lastGroup?.type === question.type) lastGroup.questions.push(question);
    else groups.push({ type: question.type, questions: [question] });
  }
  return groups;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function buildAnswerMap(
  answers: { questionId: number; userAnswer: string }[],
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const a of answers) map[a.questionId] = a.userAnswer;
  return map;
}

interface TypeStat {
  type: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
}

const TIMER_LIMIT = 20 * 60; // 20 minutes in seconds
const SAVE_DEBOUNCE_MS = 500;

export function ReadingQuestions({
  chatId,
  questions,
  sessions,
  disabled,
}: ReadingQuestionsProps) {
  const sendMessage = useSendMessage();
  const isChatLoading = useChatLoading();
  const isDisabled = disabled === true || isChatLoading;
  const { mutate: saveAnswer } = useMutation(
    trpcOptions.reading.saveAnswer.mutationOptions(),
  );
  const { mutate: submitSession } = useMutation(
    trpcOptions.reading.submitSession.mutationOptions(),
  );
  const { mutate: retakeSession } = useMutation(
    trpcOptions.reading.retakeSession.mutationOptions(),
  );

  const latestSession = sessions.at(0);
  const isSubmitted = latestSession?.submitted ?? false;

  const initialAnswers = useMemo(
    () => (latestSession ? buildAnswerMap(latestSession.answers) : {}),
    [latestSession],
  );

  const [answers, setAnswers] =
    useState<Record<number, string>>(initialAnswers);
  const [submitted, setSubmitted] = useState(isSubmitted);
  const submittingRef = useRef(false); // Guard against double-submit

  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Debounce refs for saveAnswer
  const saveTimerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Sync state when session changes (render-time check, not useEffect)
  const [trackedSessionId, setTrackedSessionId] = useState(latestSession?.id);
  const currentSessionId = latestSession?.id;
  if (currentSessionId !== trackedSessionId) {
    setTrackedSessionId(currentSessionId);
    setAnswers(latestSession ? buildAnswerMap(latestSession.answers) : {});
    setSubmitted(latestSession?.submitted ?? false);
    setElapsedSeconds(0);
    setTimedOut(false);
  }

  // Reset ref after session change (refs cannot be updated during render)
  useEffect(() => {
    submittingRef.current = false;
  }, [trackedSessionId]);

  // Timer logic
  useEffect(() => {
    if (timerEnabled && timerRunning && !submitted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= TIMER_LIMIT) {
            setTimedOut(true);
            setTimerRunning(false);
            return TIMER_LIMIT;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerEnabled, timerRunning, submitted]);

  // Cleanup debounce timers on unmount
  useEffect(
    () => () => {
      for (const timer of saveTimerRefs.current.values()) clearTimeout(timer);
    },
    [],
  );

  const groups = groupQuestionsByType(questions);

  const setAnswer = useCallback(
    (questionId: number, value: string) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));

      // Debounce server save
      const existing = saveTimerRefs.current.get(questionId);
      if (existing) clearTimeout(existing);
      saveTimerRefs.current.set(
        questionId,
        setTimeout(() => {
          saveTimerRefs.current.delete(questionId);
          saveAnswer({ chatId, questionId, userAnswer: value });
        }, SAVE_DEBOUNCE_MS),
      );
    },
    [submitted, chatId, saveAnswer],
  );

  const answeredCount = Object.values(answers).filter((v) => v !== "").length;

  const handleSubmit = useCallback(() => {
    // Guard against double-submit (double-click or auto-submit race)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitted(true);
    setTimerRunning(false);

    // Flush any pending debounced saves
    for (const [questionId, timer] of saveTimerRefs.current) {
      clearTimeout(timer);
      saveTimerRefs.current.delete(questionId);
      saveAnswer({ chatId, questionId, userAnswer: answers[questionId] ?? "" });
    }

    submitSession(
      {
        chatId,
        timeSpent: timerEnabled ? elapsedSeconds : undefined,
      },
      {
        onSuccess: () => {
          void sendMessage({
            text: "I just submitted my reading test. Please review my performance and give me detailed feedback.",
            files: [],
          });
        },
        onError: () => {
          // Allow retry on failure
          submittingRef.current = false;
          setSubmitted(false);
        },
      },
    );
  }, [
    chatId,
    answers,
    submitSession,
    saveAnswer,
    sendMessage,
    timerEnabled,
    elapsedSeconds,
  ]);

  // Auto-submit on timeout — use ref to avoid stale closure
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (timedOut && !submittingRef.current) handleSubmitRef.current();
  }, [timedOut]);

  const handleRetake = useCallback(() => {
    const prevAnswers = answers;
    const prevElapsed = elapsedSeconds;
    const prevTimedOut = timedOut;
    setAnswers({});
    setSubmitted(false);
    setElapsedSeconds(0);
    setTimedOut(false);
    submittingRef.current = false;
    retakeSession(
      { chatId },
      {
        onError: () => {
          // Rollback on failure
          setAnswers(prevAnswers);
          setSubmitted(true);
          setElapsedSeconds(prevElapsed);
          setTimedOut(prevTimedOut);
        },
      },
    );
  }, [chatId, answers, elapsedSeconds, timedOut, retakeSession]);

  const score = (() => {
    if (!submitted) return 0;
    if (latestSession?.submitted && latestSession.score !== null)
      return latestSession.score;
    let correct = 0;
    for (const q of questions) {
      const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
      if (userAnswer === q.correctAnswer.trim().toLowerCase()) correct++;
    }
    return correct;
  })();

  const percentage = submitted
    ? Math.round((score / questions.length) * 100)
    : 0;

  const remainingTime = TIMER_LIMIT - elapsedSeconds;

  // Per-type statistics for results breakdown
  const typeStats = useMemo<TypeStat[]>(() => {
    if (!submitted) return [];
    const statsMap = new Map<
      string,
      { total: number; correct: number; wrong: number; skipped: number }
    >();
    for (const q of questions) {
      const stat = statsMap.get(q.type) ?? {
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      };
      stat.total++;
      const userAnswer = (answers[q.id] ?? "").trim();
      if (!userAnswer) stat.skipped++;
      else if (
        userAnswer.toLowerCase() === q.correctAnswer.trim().toLowerCase()
      )
        stat.correct++;
      else stat.wrong++;
      statsMap.set(q.type, stat);
    }
    return [...statsMap.entries()].map(([type, stat]) => ({ type, ...stat }));
  }, [submitted, questions, answers]);

  // Answer key toggle
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 pb-8">
        {/* Timer toggle */}
        {!submitted && (
          <div className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Timed Practice</span>
              <span className="text-xs text-muted-foreground">(20 min)</span>
            </div>
            <div className="flex items-center gap-2">
              {timerEnabled && (
                <>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold",
                      remainingTime <= 60 && "text-red-500",
                      remainingTime <= 300 &&
                        remainingTime > 60 &&
                        "text-amber-500",
                    )}
                  >
                    {formatTime(remainingTime)}
                  </span>
                  <Button
                    disabled={isDisabled}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTimerRunning((prev) => !prev);
                    }}
                  >
                    {timerRunning ? (
                      <PauseIcon className="size-3.5" />
                    ) : (
                      <PlayIcon className="size-3.5" />
                    )}
                  </Button>
                </>
              )}
              <Switch
                checked={timerEnabled}
                disabled={isDisabled}
                onCheckedChange={(checked) => {
                  setTimerEnabled(checked);
                  if (checked) {
                    setTimerRunning(true);
                    setElapsedSeconds(0);
                  } else {
                    setTimerRunning(false);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {submitted && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Results</h3>
              <div className="flex items-center gap-2">
                {latestSession?.timeSpent != null && (
                  <Badge variant="outline">
                    <ClockIcon className="mr-1 size-3" />
                    {formatTime(latestSession.timeSpent)}
                  </Badge>
                )}
                <Badge variant={percentage >= 70 ? "default" : "destructive"}>
                  {score}/{questions.length} ({percentage}%)
                </Badge>
              </div>
            </div>
            <Progress value={percentage} />
            {timedOut && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Time&apos;s up! Your answers were auto-submitted.
              </p>
            )}

            {/* Per-type stats breakdown */}
            {typeStats.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pr-2 pb-1 font-medium">Question Type</th>
                      <th className="px-2 pb-1 text-center font-medium">
                        Total
                      </th>
                      <th className="px-2 pb-1 text-center font-medium text-green-600 dark:text-green-400">
                        Correct
                      </th>
                      <th className="px-2 pb-1 text-center font-medium text-red-600 dark:text-red-400">
                        Wrong
                      </th>
                      <th className="pb-1 pl-2 text-center font-medium">
                        Skipped
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeStats.map((stat) => (
                      <tr key={stat.type} className="border-b last:border-0">
                        <td className="py-1 pr-2">
                          {questionTypeLabels[stat.type] ?? stat.type}
                        </td>
                        <td className="px-2 py-1 text-center">{stat.total}</td>
                        <td className="px-2 py-1 text-center text-green-600 dark:text-green-400">
                          {stat.correct}
                        </td>
                        <td className="px-2 py-1 text-center text-red-600 dark:text-red-400">
                          {stat.wrong}
                        </td>
                        <td className="py-1 pl-2 text-center text-muted-foreground">
                          {stat.skipped}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Answer key grid */}
            <Collapsible open={answerKeyOpen} onOpenChange={setAnswerKeyOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  {answerKeyOpen ? (
                    <ChevronUpIcon className="size-3.5" />
                  ) : (
                    <ChevronDownIcon className="size-3.5" />
                  )}
                  Answer Key
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {questions.map((q) => {
                    const userAnswer = (answers[q.id] ?? "").trim();
                    const isCorrect =
                      userAnswer.toLowerCase() ===
                      q.correctAnswer.trim().toLowerCase();
                    return (
                      <div
                        key={q.id}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                            isCorrect ? "bg-green-500" : "bg-red-500",
                          )}
                        >
                          {q.questionNumber}
                        </span>
                        {isCorrect ? (
                          <CheckCircleIcon className="size-3 shrink-0 text-green-500" />
                        ) : (
                          <XCircleIcon className="size-3 shrink-0 text-red-500" />
                        )}
                        <span className="truncate text-muted-foreground">
                          {q.correctAnswer}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2">
              <Button
                disabled={isDisabled}
                size="sm"
                variant="outline"
                onClick={handleRetake}
              >
                <RotateCcwIcon className="size-3.5" />
                Retake Test
              </Button>
              <Button
                disabled={isDisabled}
                size="sm"
                variant="outline"
                onClick={() => {
                  void sendMessage({
                    text: "Please generate a new reading test on a different topic, targeting my weak areas.",
                    files: [],
                  });
                }}
              >
                <RefreshCwIcon className="size-3.5" />
                New Test
              </Button>
            </div>
          </div>
        )}

        {/* Question groups with instruction headers */}
        {groups.map((group) => {
          const startNum = group.questions[0].questionNumber;
          const endNum =
            group.questions[group.questions.length - 1].questionNumber;
          const instruction = questionTypeInstructions[group.type];

          // Table completion renders as a special group
          if (group.type === "table-completion") {
            return (
              <TableCompletionGroup
                key={`${group.type}-${startNum}`}
                answers={answers}
                disabled={submitted || isDisabled}
                endNum={endNum}
                instruction={instruction}
                questions={group.questions}
                setAnswer={setAnswer}
                startNum={startNum}
                submitted={submitted}
              />
            );
          }

          return (
            <div key={`${group.type}-${startNum}`} className="space-y-4">
              {/* Instruction banner */}
              <div className="rounded-lg bg-primary p-3 text-primary-foreground">
                <p className="text-xs font-medium">
                  Questions {startNum}
                  {startNum === endNum ? "" : `\u2013${endNum}`}:{" "}
                  {questionTypeLabels[group.type] ?? group.type}
                </p>
                {instruction && (
                  <p
                    dangerouslySetInnerHTML={{
                      __html: instruction.replaceAll(
                        /\*\*(.*?)\*\*/g,
                        "<strong>$1</strong>",
                      ),
                    }}
                    className="mt-1 text-xs opacity-90"
                  />
                )}
              </div>

              {/* Strategy Tips */}
              {(() => {
                const tips = submitted ? undefined : strategyTips[group.type];
                return tips ? (
                  <StrategyTip
                    tips={tips}
                    type={questionTypeLabels[group.type] ?? group.type}
                  />
                ) : null;
              })()}

              <Separator />
              {group.questions.map((question) => {
                const userAnswer = answers[question.id] ?? "";
                const isCorrect =
                  submitted &&
                  userAnswer.trim().toLowerCase() ===
                    question.correctAnswer.trim().toLowerCase();
                const isWrong = submitted && !isCorrect;

                return (
                  <div
                    key={question.id}
                    className={cn(
                      "space-y-3 rounded-lg border p-3",
                      submitted &&
                        isCorrect &&
                        "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                      submitted &&
                        isWrong &&
                        "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
                    )}
                  >
                    {(() => {
                      const hasInlineBlank =
                        (question.type === "fill-in-the-blank" ||
                          question.type === "sentence-completion") &&
                        question.questionText.includes("____");
                      return (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">
                              <span className="mr-2 text-muted-foreground">
                                {question.questionNumber}.
                              </span>
                              {!hasInlineBlank && question.questionText}
                            </p>
                            <AskAIDialog
                              disabled={isDisabled}
                              questionNumber={question.questionNumber}
                              questionText={question.questionText}
                            />
                          </div>

                          <QuestionInput
                            disabled={submitted || isDisabled}
                            question={question}
                            value={userAnswer}
                            onChange={(value) => {
                              setAnswer(question.id, value);
                            }}
                          />
                        </>
                      );
                    })()}

                    {submitted && (
                      <QuestionFeedback
                        isWrong={isWrong}
                        question={question}
                        userAnswer={userAnswer}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {!submitted && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </p>
            <Button disabled={isDisabled} onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function QuestionFeedback({
  question,
  userAnswer,
  isWrong,
}: {
  question: QuestionData;
  userAnswer: string;
  isWrong: boolean;
}) {
  return (
    <div className="space-y-2 border-t pt-2">
      {isWrong && (
        <p className="text-xs">
          <span className="font-medium text-red-600 dark:text-red-400">
            Your answer:
          </span>{" "}
          {userAnswer || "(no answer)"}
        </p>
      )}
      <p className="text-xs">
        <span className="font-medium text-green-600 dark:text-green-400">
          Correct answer:
        </span>{" "}
        {question.correctAnswer}
      </p>

      {question.linearthinking ? (
        <Tabs className="mt-2 w-full" defaultValue="linearthinking">
          <TabsList className="h-8 w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              className="relative h-8 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pt-2 pb-3 text-xs font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="linearthinking"
            >
              Linearthinking
            </TabsTrigger>
            <TabsTrigger
              className="relative h-8 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pt-2 pb-3 text-xs font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="summary"
            >
              Summary
            </TabsTrigger>
          </TabsList>
          <TabsContent
            className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground"
            value="linearthinking"
          >
            {question.linearthinking}
          </TabsContent>
          <TabsContent
            className="mt-2 text-xs text-muted-foreground"
            value="summary"
          >
            {question.explanation}
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-xs text-muted-foreground">{question.explanation}</p>
      )}

      {question.passageQuote && (
        <div className="rounded-md border-l-2 border-blue-400 bg-blue-50/50 p-2 dark:bg-blue-950/20">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Passage quote:
          </p>
          <p className="text-xs text-blue-600 italic dark:text-blue-400">
            &ldquo;{question.passageQuote}&rdquo;
          </p>
        </div>
      )}

      {question.paraphrase && (
        <div className="rounded-md border-l-2 border-purple-400 bg-purple-50/50 p-2 dark:bg-purple-950/20">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
            Paraphrase mapping:
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Question: &ldquo;{question.paraphrase.questionPhrase}&rdquo;
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Passage: &ldquo;{question.paraphrase.passagePhrase}&rdquo;
          </p>
        </div>
      )}

      {isWrong && question.distractors.length > 0 && (
        <div className="rounded-md border-l-2 border-amber-400 bg-amber-50/50 p-2 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Distractors:
          </p>
          {question.distractors.map((d, idx) => (
            <p key={idx} className="text-xs text-amber-600 dark:text-amber-400">
              &bull; &ldquo;{d.text}&rdquo; &mdash; {d.explanation}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function TableCompletionGroup({
  questions,
  answers,
  setAnswer,
  disabled,
  submitted,
  startNum,
  endNum,
  instruction,
}: {
  questions: QuestionData[];
  answers: Record<number, string>;
  setAnswer: (questionId: number, value: string) => void;
  disabled: boolean;
  submitted: boolean;
  startNum: number;
  endNum: number;
  instruction: string | undefined;
}) {
  // Find the first question with tableData to get the table structure
  const tableSource = questions.find((q) => q.tableData);
  const tableData = tableSource?.tableData;

  // Build a map from question number to question for marker resolution
  const questionByNumber = new Map(questions.map((q) => [q.questionNumber, q]));

  // Check if table markers properly resolve to individual questions
  // If not (e.g., agent used {{Q8a}} style with a single question), skip the table
  const markersValid = (() => {
    if (!tableData) return false;
    const markerPattern = /\{\{Q(\d+)\}\}/;
    let foundCount = 0;
    for (const row of tableData.rows) {
      for (const cell of row.cells) {
        const match = markerPattern.exec(cell);
        if (match && questionByNumber.has(Number(match[1]))) foundCount++;
      }
    }
    return foundCount > 0;
  })();

  return (
    <div className="space-y-4">
      {/* Instruction banner */}
      <div className="rounded-lg bg-primary p-3 text-primary-foreground">
        <p className="text-xs font-medium">
          Questions {startNum}
          {startNum === endNum ? "" : `\u2013${endNum}`}: Table Completion
        </p>
        {instruction && (
          <p
            dangerouslySetInnerHTML={{
              __html: instruction.replaceAll(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>",
              ),
            }}
            className="mt-1 text-xs opacity-90"
          />
        )}
      </div>

      {tableData && markersValid ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{tableData.title}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium" />
                  {tableData.columnHeaders.map((header, headerIdx) => (
                    <th key={headerIdx} className="p-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b last:border-0">
                    <td className="p-2 font-medium">{row.header}</td>
                    {row.cells.map((cell, cellIdx) => {
                      const markerMatch = /\{\{Q(\d+)\}\}/.exec(cell);
                      if (markerMatch) {
                        const qNum = Number(markerMatch[1]);
                        const q = questionByNumber.get(qNum);
                        if (q) {
                          const userAnswer = answers[q.id] ?? "";
                          const isCorrect =
                            submitted &&
                            userAnswer.trim().toLowerCase() ===
                              q.correctAnswer.trim().toLowerCase();
                          const isWrong = submitted && !isCorrect;
                          return (
                            <td
                              key={cellIdx}
                              className={cn(
                                "p-2",
                                submitted &&
                                  isCorrect &&
                                  "bg-green-50/50 dark:bg-green-950/20",
                                submitted &&
                                  isWrong &&
                                  "bg-red-50/50 dark:bg-red-950/20",
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {qNum}.
                                </span>
                                <Input
                                  className="h-7 w-28 text-sm"
                                  disabled={disabled}
                                  placeholder="..."
                                  value={userAnswer}
                                  onChange={(e) => {
                                    setAnswer(q.id, e.target.value);
                                  }}
                                />
                              </div>
                              {submitted && isWrong && (
                                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                                  {q.correctAnswer}
                                </p>
                              )}
                            </td>
                          );
                        }
                      }
                      return (
                        <td key={cellIdx} className="p-2">
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Fallback: render as regular questions if no tableData
        questions.map((question) => {
          const userAnswer = answers[question.id] ?? "";
          const isCorrect =
            submitted &&
            userAnswer.trim().toLowerCase() ===
              question.correctAnswer.trim().toLowerCase();
          const isWrong = submitted && !isCorrect;
          return (
            <div
              key={question.id}
              className={cn(
                "space-y-3 rounded-lg border p-3",
                submitted &&
                  isCorrect &&
                  "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                submitted &&
                  isWrong &&
                  "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
              )}
            >
              <p className="text-sm font-medium">
                <span className="mr-2 text-muted-foreground">
                  {question.questionNumber}.
                </span>
                {question.questionText}
              </p>
              <Input
                disabled={disabled}
                placeholder="Type your answer..."
                value={userAnswer}
                onChange={(e) => {
                  setAnswer(question.id, e.target.value);
                }}
              />
              {submitted && (
                <QuestionFeedback
                  isWrong={isWrong}
                  question={question}
                  userAnswer={userAnswer}
                />
              )}
            </div>
          );
        })
      )}

      {/* Post-submission enrichment for table questions */}
      {submitted &&
        questions.map((question) => {
          const userAnswer = answers[question.id] ?? "";
          const isWrong =
            userAnswer.trim().toLowerCase() !==
            question.correctAnswer.trim().toLowerCase();
          if (
            !isWrong &&
            !question.passageQuote &&
            !question.paraphrase &&
            question.distractors.length === 0
          )
            return null;
          return (
            <div key={`feedback-${question.id}`} className="pl-2">
              <p className="text-xs font-medium text-muted-foreground">
                Q{question.questionNumber}:
              </p>
              {question.linearthinking ? (
                <Tabs className="mt-1 w-full" defaultValue="linearthinking">
                  <TabsList className="h-7 w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                      className="relative h-7 rounded-none border-b-2 border-b-transparent bg-transparent px-3 pt-1 pb-2 text-[10px] font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      value="linearthinking"
                    >
                      Linearthinking
                    </TabsTrigger>
                    <TabsTrigger
                      className="relative h-7 rounded-none border-b-2 border-b-transparent bg-transparent px-3 pt-1 pb-2 text-[10px] font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      value="summary"
                    >
                      Summary
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent
                    className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground"
                    value="linearthinking"
                  >
                    {question.linearthinking}
                  </TabsContent>
                  <TabsContent
                    className="mt-1 text-xs text-muted-foreground"
                    value="summary"
                  >
                    {question.explanation}
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.explanation}
                </p>
              )}
              {question.passageQuote && (
                <div className="mt-1 rounded-md border-l-2 border-blue-400 bg-blue-50/50 p-2 dark:bg-blue-950/20">
                  <p className="text-xs text-blue-600 italic dark:text-blue-400">
                    &ldquo;{question.passageQuote}&rdquo;
                  </p>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function StrategyTip({ type, tips }: { type: string; tips: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-left transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
          type="button"
        >
          <LightbulbIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            Strategy Tip: {type}
          </span>
          {open ? (
            <ChevronUpIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDownIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          {tips.map((tip, idx) => (
            <li
              key={idx}
              className="flex gap-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">
                {idx + 1}.
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionData;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case "true-false-not-given": {
      return (
        <RadioGroup disabled={disabled} value={value} onValueChange={onChange}>
          {["True", "False", "Not Given"].map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem id={`${question.id}-${option}`} value={option} />
              <Label
                className="text-sm font-normal"
                htmlFor={`${question.id}-${option}`}
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    case "yes-no-not-given": {
      return (
        <RadioGroup disabled={disabled} value={value} onValueChange={onChange}>
          {["Yes", "No", "Not Given"].map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem id={`${question.id}-${option}`} value={option} />
              <Label
                className="text-sm font-normal"
                htmlFor={`${question.id}-${option}`}
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    case "multiple-choice": {
      return (
        <RadioGroup disabled={disabled} value={value} onValueChange={onChange}>
          {question.options.map((option, idx) => {
            const letter = String.fromCodePoint(65 + idx);
            return (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem
                  id={`${question.id}-${letter}`}
                  value={option}
                />
                <Label
                  className="text-sm font-normal"
                  htmlFor={`${question.id}-${letter}`}
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      );
    }

    case "fill-in-the-blank":
    case "sentence-completion": {
      // Check for inline blank placeholder
      const blankIndex = question.questionText.indexOf("____");
      if (blankIndex !== -1) {
        const before = question.questionText.slice(0, blankIndex);
        const after = question.questionText.slice(blankIndex + 4);
        return (
          <p className="text-sm/relaxed">
            {before}
            <Input
              className="mx-1 inline-block h-7 w-28 border-b border-dashed text-sm"
              disabled={disabled}
              placeholder="..."
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
            />
            {after}
          </p>
        );
      }
      return (
        <Input
          disabled={disabled}
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
    }

    case "summary-completion": {
      return question.options.length > 0 ? (
        <div className="space-y-2">
          <Input
            disabled={disabled}
            placeholder="Type your answer..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
          />
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Word bank:</span>
            {question.options.map((word) => (
              <button
                key={word}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs transition-colors",
                  value === word
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
                disabled={disabled}
                type="button"
                onClick={() => {
                  onChange(word);
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Input
          disabled={disabled}
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
    }

    case "matching-headings": {
      return (
        <RadioGroup disabled={disabled} value={value} onValueChange={onChange}>
          {question.options.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem id={`${question.id}-${option}`} value={option} />
              <Label
                className="text-sm font-normal"
                htmlFor={`${question.id}-${option}`}
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    default: {
      return (
        <Input
          disabled={disabled}
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
    }
  }
}

export type { QuestionData, SessionData };
