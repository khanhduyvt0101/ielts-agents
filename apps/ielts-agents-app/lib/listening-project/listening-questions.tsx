import { useMutation } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  LightbulbIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
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
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChatLoading } from "#./lib/use-chat-loading.ts";
import { useSendMessage } from "#./lib/use-send-message.ts";

interface QuestionData {
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
}

interface SessionData {
  id: number;
  score: number | null;
  totalQuestions: number | null;
  timeSpent: number | null;
  submitted: boolean;
  answers: { id: number; questionId: number; userAnswer: string }[];
}

interface ListeningQuestionsProps {
  chatId: number;
  questions: QuestionData[];
  sessions: SessionData[];
  disabled?: boolean;
  sectionNumber?: number;
  firstSectionNumber?: number;
  totalQuestions?: QuestionData[];
}

const questionTypeLabels: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  matching: "Matching",
  "plan-map-diagram": "Plan/Map/Diagram",
  "form-completion": "Form Completion",
  "note-completion": "Note Completion",
  "table-completion": "Table Completion",
  "flow-chart-completion": "Flow Chart Completion",
  "summary-completion": "Summary Completion",
  "sentence-completion": "Sentence Completion",
  "short-answer": "Short Answer",
};

const strategyTips: Partial<Record<string, string[]>> = {
  "multiple-choice": [
    "Read all options before the audio plays — underline keywords.",
    "The correct answer is often a paraphrase, not the exact words.",
    "Watch for distractors — speakers may mention multiple options but confirm only one.",
    "Listen for signpost words like 'actually', 'in fact', 'what I meant was'.",
  ],
  matching: [
    "Read all items in both lists before listening.",
    "Listen for synonyms and paraphrases of the listed items.",
    "Not all options may be used — some are distractors.",
    "The answers usually come in order of the audio.",
  ],
  "plan-map-diagram": [
    "Study the map or diagram carefully before the audio starts.",
    "Identify compass directions and reference points already labelled.",
    "Listen for prepositions of place: opposite, next to, between, at the end of.",
    "Follow the speaker's route or description step by step.",
  ],
  "form-completion": [
    "Read the form before listening to predict answer types (name, date, number).",
    "Listen for spelling — speakers often spell out names and addresses.",
    "Pay attention to number corrections ('No, that's 4-5, not 5-4').",
    "Keep within the word limit specified.",
  ],
  "note-completion": [
    "Scan the notes before listening to understand the topic structure.",
    "Answers are usually key facts: names, dates, numbers, places.",
    "Notes follow the order of the audio — don't jump ahead.",
    "Write exactly what you hear — don't paraphrase.",
  ],
  "table-completion": [
    "Read column and row headings to understand the table structure.",
    "Predict the type of information needed for each blank (number, name, category).",
    "Answers follow the order of the audio — work through row by row.",
    "Keep within the word limit specified.",
  ],
  "flow-chart-completion": [
    "Read the flow chart from start to finish to understand the process.",
    "Identify what type of information is missing at each step.",
    "Listen for sequence markers: first, then, next, after that, finally.",
    "Answers follow the order of the process described.",
  ],
  "sentence-completion": [
    "Read the incomplete sentence to predict the answer type.",
    "The answer must fit grammatically into the sentence.",
    "Use words directly from the audio — don't change the form.",
    "Respect the word limit (usually 1-3 words).",
  ],
  "summary-completion": [
    "Read the entire summary first to understand the overall meaning.",
    "If given a word bank, eliminate options as you use them.",
    "The summary follows the audio order.",
    "Check grammar after completing each blank.",
  ],
  "short-answer": [
    "Read the question carefully — it specifies what to listen for.",
    "Answers are brief: names, numbers, dates, or short phrases.",
    "Stick to the word limit (usually no more than 3 words).",
    "Write exactly what is said — spelling counts!",
  ],
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function buildAnswerMap(
  answers: { questionId: number; userAnswer: string }[],
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const a of answers) map[a.questionId] = a.userAnswer;
  return map;
}

interface SectionGroup {
  sectionNumber: number;
  questions: QuestionData[];
}

function groupBySection(questions: QuestionData[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const q of questions) {
    const lastGroup = groups.at(-1);
    if (lastGroup?.sectionNumber === q.sectionNumber)
      lastGroup.questions.push(q);
    else groups.push({ sectionNumber: q.sectionNumber, questions: [q] });
  }
  return groups;
}

interface QuestionTypeGroup {
  type: string;
  questions: QuestionData[];
}

function groupByType(questions: QuestionData[]): QuestionTypeGroup[] {
  const groups: QuestionTypeGroup[] = [];
  for (const q of questions) {
    const lastGroup = groups.at(-1);
    if (lastGroup?.type === q.type) lastGroup.questions.push(q);
    else groups.push({ type: q.type, questions: [q] });
  }
  return groups;
}

const TIMER_LIMIT = 30 * 60; // 30 minutes
const SAVE_DEBOUNCE_MS = 500;

export function ListeningQuestions({
  chatId,
  questions,
  sessions,
  disabled,
  sectionNumber,
  firstSectionNumber,
  totalQuestions,
}: ListeningQuestionsProps) {
  const sendMessage = useSendMessage();
  const isChatLoading = useChatLoading();
  const isDisabled = disabled === true || isChatLoading;
  const { mutate: saveAnswer } = useMutation(
    trpcOptions.listening.saveAnswer.mutationOptions(),
  );
  const { mutate: submitSession } = useMutation(
    trpcOptions.listening.submitSession.mutationOptions(),
  );
  const { mutate: retakeSession } = useMutation(
    trpcOptions.listening.retakeSession.mutationOptions(),
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
  const submittingRef = useRef(false);

  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const saveTimerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const [trackedSessionId, setTrackedSessionId] = useState(latestSession?.id);
  const currentSessionId = latestSession?.id;
  if (currentSessionId !== trackedSessionId) {
    setTrackedSessionId(currentSessionId);
    setAnswers(latestSession ? buildAnswerMap(latestSession.answers) : {});
    setSubmitted(latestSession?.submitted ?? false);
    setElapsedSeconds(0);
    setTimedOut(false);
  }

  useEffect(() => {
    submittingRef.current = false;
  }, [trackedSessionId]);

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

  useEffect(
    () => () => {
      for (const timer of saveTimerRefs.current.values()) clearTimeout(timer);
    },
    [],
  );

  const sectionGroups = groupBySection(questions);

  const setAnswer = useCallback(
    (questionId: number, value: string) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));

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

  const allQuestions = totalQuestions ?? questions;
  const allAnsweredCount = Object.values(answers).filter(
    (v) => v !== "",
  ).length;
  const answeredCount = allAnsweredCount;

  const handleSubmit = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitted(true);
    setTimerRunning(false);

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
            text: "I just submitted my listening test. Please review my performance and give me detailed feedback.",
            files: [],
          });
        },
        onError: () => {
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
    for (const q of allQuestions) {
      const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
      if (userAnswer === q.correctAnswer.trim().toLowerCase()) correct++;
    }
    return correct;
  })();

  const percentage =
    submitted && allQuestions.length > 0
      ? Math.round((score / allQuestions.length) * 100)
      : 0;

  const remainingTime = TIMER_LIMIT - elapsedSeconds;

  // Show timer and results only on the first section tab to avoid duplication
  const isFirstSection =
    sectionNumber === undefined ||
    sectionNumber === (firstSectionNumber ?? 1);

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Timer toggle - only on first section */}
      {isFirstSection && !submitted && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Timed Practice</span>
            <span className="text-xs text-muted-foreground">(30 min)</span>
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

      {/* Results - only on first section */}
      {isFirstSection && submitted && (
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
                {score}/{allQuestions.length} ({percentage}%)
              </Badge>
            </div>
          </div>
          <Progress value={percentage} />
          {timedOut && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Time&apos;s up! Your answers were auto-submitted.
            </p>
          )}
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
                  text: "Please generate a new listening test on a different topic, targeting my weak areas.",
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

      {/* Questions grouped by type within this section */}
      {sectionGroups.map((section) => {
        const startNum = section.questions[0].questionNumber;
        const endNum =
          section.questions[section.questions.length - 1].questionNumber;
        const typeGroups = groupByType(section.questions);

        return (
          <div key={section.sectionNumber} className="space-y-4">
            <h3 className="text-sm font-bold">
              Section {section.sectionNumber}: Questions {startNum}-{endNum}
            </h3>

            {typeGroups.map((group) => {
              const gStart = group.questions[0].questionNumber;
              const gEnd =
                group.questions[group.questions.length - 1].questionNumber;
              const tips = submitted ? undefined : strategyTips[group.type];

              return (
                <div key={`${group.type}-${gStart}`} className="space-y-3">
                  <div>
                    <Badge variant="secondary">
                      {questionTypeLabels[group.type] ?? group.type}
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      Q{gStart}
                      {gStart === gEnd ? "" : `-${gEnd}`}
                    </span>
                  </div>

                  {tips && (
                    <StrategyTip
                      tips={tips}
                      type={questionTypeLabels[group.type] ?? group.type}
                    />
                  )}

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
                        <p className="text-sm font-medium">
                          <span className="mr-2 text-muted-foreground">
                            {question.questionNumber}.
                          </span>
                          {question.questionText}
                        </p>

                        <QuestionInput
                          disabled={submitted || isDisabled}
                          question={question}
                          value={userAnswer}
                          onChange={(value) => {
                            setAnswer(question.id, value);
                          }}
                        />

                        {submitted && (
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
                            <p className="text-xs text-muted-foreground">
                              {question.explanation}
                            </p>

                            {question.scriptQuote && (
                              <div className="rounded-md border-l-2 border-blue-400 bg-blue-50/50 p-2 dark:bg-blue-950/20">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                  Script quote:
                                </p>
                                <p className="text-xs text-blue-600 italic dark:text-blue-400">
                                  &ldquo;{question.scriptQuote}&rdquo;
                                </p>
                              </div>
                            )}

                            {question.paraphrase && (
                              <div className="rounded-md border-l-2 border-purple-400 bg-purple-50/50 p-2 dark:bg-purple-950/20">
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                  Paraphrase mapping:
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                  Question: &ldquo;
                                  {question.paraphrase.questionPhrase}&rdquo;
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                  Script: &ldquo;
                                  {question.paraphrase.scriptPhrase}&rdquo;
                                </p>
                              </div>
                            )}

                            {isWrong &&
                              question.distractors.length > 0 && (
                                <div className="rounded-md border-l-2 border-amber-400 bg-amber-50/50 p-2 dark:bg-amber-950/20">
                                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                    Distractors:
                                  </p>
                                  {question.distractors.map((d, idx) => (
                                    <p
                                      key={idx}
                                      className="text-xs text-amber-600 dark:text-amber-400"
                                    >
                                      &bull; &ldquo;{d.text}&rdquo; &mdash;{" "}
                                      {d.explanation}
                                    </p>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Submit button - only on last section or when no section specified */}
      {!submitted && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{allQuestions.length} answered
          </p>
          <Button disabled={isDisabled} onClick={handleSubmit}>
            Submit Answers
          </Button>
        </div>
      )}
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

    case "matching": {
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

    default: {
      return (
        <Input
          disabled={disabled}
          placeholder={
            question.type === "short-answer"
              ? "Type your answer (max 3 words)..."
              : "Type your answer..."
          }
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
