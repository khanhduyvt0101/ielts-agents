import { ArrowRightIcon, CheckCircleIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";

interface WritingEvaluationProps {
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
  };
}

function getBandColorClasses(score: string): string {
  const num = Number.parseFloat(score);
  if (num >= 8)
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400";
  if (num >= 7)
    return "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400";
  if (num >= 5.5)
    return "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400";
  return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400";
}

function getBandTextColor(score: string): string {
  const num = Number.parseFloat(score);
  if (num >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (num >= 7) return "text-green-600 dark:text-green-400";
  if (num >= 5.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getBandBorderColor(score: string): string {
  const num = Number.parseFloat(score);
  if (num >= 8) return "border-t-emerald-500";
  if (num >= 7) return "border-t-green-500";
  if (num >= 5.5) return "border-t-amber-500";
  return "border-t-red-500";
}

const criteriaLabels: Record<string, string> = {
  taskAchievement: "Task Achievement",
  coherenceCohesion: "Coherence & Cohesion",
  lexicalResource: "Lexical Resource",
  grammaticalRange: "Grammar Range",
};

export function WritingEvaluation({ evaluation }: WritingEvaluationProps) {
  const criteria = [
    { key: "taskAchievement", score: evaluation.taskAchievement },
    { key: "coherenceCohesion", score: evaluation.coherenceCohesion },
    { key: "lexicalResource", score: evaluation.lexicalResource },
    { key: "grammaticalRange", score: evaluation.grammaticalRange },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Overall Score */}
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <div className="text-center">
              <div
                className={`inline-flex size-16 items-center justify-center rounded-full text-2xl font-bold ${getBandColorClasses(evaluation.overallBand)}`}
              >
                {evaluation.overallBand}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Overall Band Score
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4 Criteria Scores */}
        <div className="grid grid-cols-2 gap-3">
          {criteria.map((c) => (
            <Card
              key={c.key}
              className={`border-t-2 ${getBandBorderColor(c.score)}`}
            >
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {criteriaLabels[c.key]}
                </p>
                <p
                  className={`text-2xl font-bold ${getBandTextColor(c.score)}`}
                >
                  {c.score}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Feedback */}
        {evaluation.feedback.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Detailed Feedback
            </h3>
            <div className="space-y-2">
              {evaluation.feedback.map((fb) => (
                <FeedbackSection key={fb.criterion} feedback={fb} />
              ))}
            </div>
          </div>
        )}

        {/* Corrections */}
        {evaluation.corrections.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Corrections
            </h3>
            <Card>
              <CardContent className="space-y-3 pt-4">
                {evaluation.corrections.map((c, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 line-through dark:text-red-400">
                        {c.original}
                      </span>
                      <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                      <span className="text-green-600 dark:text-green-400">
                        {c.corrected}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.explanation} ({c.type})
                    </p>
                    {i < evaluation.corrections.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Model Phrases */}
        {evaluation.modelPhrases.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Model Phrases
            </h3>
            <Card>
              <CardContent className="pt-4">
                <ul className="space-y-1.5">
                  {evaluation.modelPhrases.map((phrase, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground italic"
                    >
                      &ldquo;{phrase}&rdquo;
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Improved Paragraphs */}
        {evaluation.improvedParagraphs.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Improved Paragraphs
            </h3>
            <div className="space-y-2">
              {evaluation.improvedParagraphs.map((p, i) => (
                <ImprovedParagraphSection key={i} paragraph={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function FeedbackSection({
  feedback,
}: {
  feedback: {
    criterion: string;
    score: string;
    comments: string;
    strengths: string[];
    improvements: string[];
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {feedback.criterion} ({feedback.score})
              </CardTitle>
              <ChevronDownIcon
                className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 px-3 pt-0 pb-3">
            <p className="text-sm text-muted-foreground">{feedback.comments}</p>
            {feedback.strengths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">
                  Strengths
                </p>
                <ul className="space-y-1">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm">
                      <CheckCircleIcon className="mt-0.5 size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.improvements.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Areas to Improve
                </p>
                <ul className="space-y-1">
                  {feedback.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm">
                      <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ImprovedParagraphSection({
  paragraph,
}: {
  paragraph: {
    original: string;
    improved: string;
    explanation: string;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {paragraph.original.slice(0, 60)}
                {paragraph.original.length > 60 ? "..." : ""}
              </CardTitle>
              <ChevronDownIcon
                className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 px-3 pt-0 pb-3">
            <div className="rounded-md bg-red-50 p-2 dark:bg-red-950">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                Original
              </p>
              <p className="mt-1 text-sm">{paragraph.original}</p>
            </div>
            <div className="rounded-md bg-green-50 p-2 dark:bg-green-950">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                Improved
              </p>
              <p className="mt-1 text-sm">{paragraph.improved}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {paragraph.explanation}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
