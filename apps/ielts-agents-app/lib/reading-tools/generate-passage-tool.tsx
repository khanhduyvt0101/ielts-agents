import type { AgentMessage } from "ielts-agents-api/types";

import { BookOpenIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";

type MessagePart = AgentMessage["reading"]["parts"][number];

interface GeneratePassageToolProps {
  toolPart: Extract<MessagePart, { type: "tool-generate-passage" }>;
}

export function GeneratePassageTool({ toolPart }: GeneratePassageToolProps) {
  const isComplete = toolPart.state === "output-available";

  if (toolPart.state === "output-error") {
    return (
      <Task
        isComplete
        icon={
          <ToolIcon isComplete>
            <BookOpenIcon className="size-4" />
          </ToolIcon>
        }
        label="Generate reading passage"
      >
        <ToolErrorContent
          description={toolPart.errorText}
          title="Failed to generate passage"
          toolPart={toolPart}
        />
      </Task>
    );
  }

  const title =
    toolPart.state === "input-available" || isComplete
      ? toolPart.input.title
      : undefined;

  const difficulty =
    toolPart.state === "input-available" || isComplete
      ? toolPart.input.difficulty
      : undefined;

  const label = title
    ? `Generated passage: ${title}`
    : "Generating reading passage...";

  return (
    <Task
      icon={
        <ToolIcon isComplete={isComplete}>
          <BookOpenIcon className="size-4" />
        </ToolIcon>
      }
      isComplete={isComplete}
      label={label}
    >
      <ToolContainer>
        <div className="space-y-2 p-3">
          {title ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{title}</p>
              {difficulty && (
                <Badge variant="secondary">Band {difficulty}</Badge>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}
          {isComplete && (
            <p className="text-xs text-muted-foreground">
              Passage generated — view it in the Reading Test panel
            </p>
          )}
        </div>
      </ToolContainer>
    </Task>
  );
}
