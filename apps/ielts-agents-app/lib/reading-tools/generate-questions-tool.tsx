import type { AgentMessage } from "ielts-agents-api/types";

import { ListChecksIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";

type MessagePart = AgentMessage["reading"]["parts"][number];

interface GenerateQuestionsToolProps {
  toolPart: Extract<MessagePart, { type: "tool-generate-questions" }>;
}

const questionTypeLabels: Record<string, string> = {
  "true-false-not-given": "True / False / Not Given",
  "multiple-choice": "Multiple Choice",
  "fill-in-the-blank": "Fill in the Blank",
  "matching-headings": "Matching Headings",
};

export function GenerateQuestionsTool({
  toolPart,
}: GenerateQuestionsToolProps) {
  const isComplete = toolPart.state === "output-available";

  if (toolPart.state === "output-error") {
    return (
      <Task
        isComplete
        icon={
          <ToolIcon isComplete>
            <ListChecksIcon className="size-4" />
          </ToolIcon>
        }
        label="Generate questions"
      >
        <ToolErrorContent
          description={toolPart.errorText}
          title="Failed to generate questions"
          toolPart={toolPart}
        />
      </Task>
    );
  }

  const questions =
    toolPart.state === "input-available" || isComplete
      ? toolPart.input.questions
      : undefined;

  const count = questions?.length ?? 0;
  const label = isComplete
    ? `Generated ${count} ${count === 1 ? "question" : "questions"}`
    : "Generating questions...";

  const typeCounts = questions
    ? getTypeCounts(questions.map((q) => q.type))
    : undefined;

  return (
    <Task
      icon={
        <ToolIcon isComplete={isComplete}>
          <ListChecksIcon className="size-4" />
        </ToolIcon>
      }
      isComplete={isComplete}
      label={label}
    >
      <ToolContainer>
        <div className="space-y-2 p-3">
          {typeCounts ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {typeCounts.map(({ type, count: typeCount }) => (
                  <Badge key={type} variant="secondary">
                    {questionTypeLabels[type] ?? type} ({typeCount})
                  </Badge>
                ))}
              </div>
              {isComplete && (
                <p className="text-xs text-muted-foreground">
                  Questions ready — switch to the Questions tab in the Reading
                  Test panel
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}
        </div>
      </ToolContainer>
    </Task>
  );
}

function getTypeCounts(types: string[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
  const result: { type: string; count: number }[] = [];
  for (const [type, count] of counts) result.push({ type, count });
  return result;
}
