import type { AgentMessage } from "ielts-agents-api/types";

import { FileTextIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";

type MessagePart = AgentMessage["listening"]["parts"][number];

interface GenerateScriptToolProps {
  toolPart: Extract<MessagePart, { type: "tool-generate-script" }>;
}

export function GenerateScriptTool({ toolPart }: GenerateScriptToolProps) {
  const isComplete = toolPart.state === "output-available";

  if (toolPart.state === "output-error") {
    return (
      <Task
        isComplete
        icon={
          <ToolIcon isComplete>
            <FileTextIcon className="size-4" />
          </ToolIcon>
        }
        label="Generate listening scripts"
      >
        <ToolErrorContent
          description={toolPart.errorText}
          title="Failed to generate scripts"
          toolPart={toolPart}
        />
      </Task>
    );
  }

  const sections =
    toolPart.state === "input-available" || isComplete
      ? toolPart.input.sections
      : undefined;

  const label = sections
    ? `Generated scripts for ${sections.length} sections`
    : "Generating listening scripts...";

  return (
    <Task
      icon={
        <ToolIcon isComplete={isComplete}>
          <FileTextIcon className="size-4" />
        </ToolIcon>
      }
      isComplete={isComplete}
      label={label}
    >
      <ToolContainer>
        <div className="space-y-2 p-3">
          {sections ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => (
                  <Badge key={s.sectionNumber} variant="secondary">
                    S{s.sectionNumber}: {s.title}
                  </Badge>
                ))}
              </div>
              {isComplete && (
                <p className="text-xs text-muted-foreground">
                  Scripts generated — view them in the Listening Test panel
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}
        </div>
      </ToolContainer>
    </Task>
  );
}
