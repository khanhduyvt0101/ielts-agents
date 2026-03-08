import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

interface QuestionData {
  id: number;
  questionNumber: number;
  type: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuestionGroup {
  type: string;
  questions: QuestionData[];
}

interface ReadingQuestionsProps {
  questions: QuestionData[];
  onAskAI?: (question: string) => void;
}

const questionTypeLabels: Record<string, string> = {
  "true-false-not-given": "True / False / Not Given",
  "multiple-choice": "Multiple Choice",
  "fill-in-the-blank": "Fill in the Blank",
  "matching-headings": "Matching Headings",
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

export function ReadingQuestions({
  questions,
  onAskAI,
}: ReadingQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const groups = groupQuestionsByType(questions);

  const setAnswer = (questionId: number, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.values(answers).filter((v) => v !== "").length;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const score = (() => {
    if (!submitted) return 0;
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

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 pb-8">
        {submitted && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Results</h3>
              <Badge variant={percentage >= 70 ? "default" : "destructive"}>
                {score}/{questions.length} ({percentage}%)
              </Badge>
            </div>
            <Progress value={percentage} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRetake}>
                Retake Test
              </Button>
              {onAskAI && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onAskAI(
                      `I scored ${score}/${questions.length} on this reading test. Can you help me understand the questions I got wrong?`,
                    );
                  }}
                >
                  Ask AI for Help
                </Button>
              )}
            </div>
          </div>
        )}

        {groups.map((group) => {
          const startNum = group.questions[0].questionNumber;
          const endNum =
            group.questions[group.questions.length - 1].questionNumber;

          return (
            <div key={`${group.type}-${startNum}`} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Questions {startNum}-{endNum}
                </h3>
                <Badge className="mt-1" variant="secondary">
                  {questionTypeLabels[group.type]}
                </Badge>
              </div>
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
                      disabled={submitted}
                      question={question}
                      value={userAnswer}
                      onChange={(value) => {
                        setAnswer(question.id, value);
                      }}
                    />

                    {submitted && (
                      <div className="space-y-1 border-t pt-2">
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
                      </div>
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
            <Button onClick={handleSubmit}>Submit Answers</Button>
          </div>
        )}
      </div>
    </ScrollArea>
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

    case "fill-in-the-blank": {
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
      return null;
    }
  }
}

export type { QuestionData };
