import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";

interface SpeakingEvaluationProps {
  evaluation: {
    fluencyCoherence: string;
    lexicalResource: string;
    grammaticalRange: string;
    pronunciation: string;
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
    improvedResponses: {
      original: string;
      improved: string;
      explanation: string;
    }[];
  };
}

export function SpeakingEvaluation({ evaluation }: SpeakingEvaluationProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="text-lg">Band {evaluation.overallBand}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">FC: {evaluation.fluencyCoherence}</Badge>
            <Badge variant="outline">LR: {evaluation.lexicalResource}</Badge>
            <Badge variant="outline">GRA: {evaluation.grammaticalRange}</Badge>
            <Badge variant="outline">P: {evaluation.pronunciation}</Badge>
          </div>
        </div>

        {evaluation.feedback.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{item.criterion}</h4>
              <Badge variant="secondary">{item.score}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{item.comments}</p>
            {item.strengths.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Strengths
                </span>
                <ul className="list-inside list-disc space-y-0.5">
                  {item.strengths.map((s, i) => (
                    <li key={i} className="text-xs">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {item.improvements.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  To Improve
                </span>
                <ul className="list-inside list-disc space-y-0.5">
                  {item.improvements.map((s, i) => (
                    <li key={i} className="text-xs">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {evaluation.corrections.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Corrections</h4>
            {evaluation.corrections.map((c, i) => (
              <div key={i} className="rounded-md border p-2 text-xs">
                <div className="flex items-start gap-2">
                  <Badge className="shrink-0 text-[10px]" variant="outline">
                    {c.type}
                  </Badge>
                </div>
                <p className="mt-1 text-red-600 line-through dark:text-red-400">
                  {c.original}
                </p>
                <p className="text-green-600 dark:text-green-400">
                  {c.corrected}
                </p>
                <p className="mt-1 text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {evaluation.modelPhrases.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Model Phrases</h4>
            <ul className="list-inside list-disc space-y-1">
              {evaluation.modelPhrases.map((p, i) => (
                <li key={i} className="text-xs">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.improvedResponses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Improved Responses</h4>
            {evaluation.improvedResponses.map((r, i) => (
              <div key={i} className="rounded-md border p-2 text-xs">
                <p className="text-muted-foreground">
                  <strong>Original:</strong> {r.original}
                </p>
                <p className="mt-1 text-green-600 dark:text-green-400">
                  <strong>Improved:</strong> {r.improved}
                </p>
                <p className="mt-1 text-muted-foreground">{r.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
