import type { AgentMessage } from "ielts-agents-api/types";

import { Volume2Icon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";

type MessagePart = AgentMessage["listening"]["parts"][number];

interface GenerateAudioToolProps {
  toolPart: Extract<MessagePart, { type: "tool-generate-audio" }>;
}

export function GenerateAudioTool({ toolPart }: GenerateAudioToolProps) {
  const isComplete = toolPart.state === "output-available";

  if (toolPart.state === "output-error") {
    return (
      <Task
        isComplete
        icon={
          <ToolIcon isComplete>
            <Volume2Icon className="size-4" />
          </ToolIcon>
        }
        label="Generate audio"
      >
        <ToolErrorContent
          description={toolPart.errorText}
          title="Failed to generate audio"
          toolPart={toolPart}
        />
      </Task>
    );
  }

  const sectionNumber =
    toolPart.state === "input-available" || isComplete
      ? toolPart.input.sectionNumber
      : undefined;

  const label = sectionNumber
    ? `Generated audio for Section ${sectionNumber}`
    : "Generating audio...";

  return (
    <Task
      icon={
        <ToolIcon isComplete={isComplete}>
          <Volume2Icon className="size-4" />
        </ToolIcon>
      }
      isComplete={isComplete}
      label={label}
    >
      <ToolContainer>
        <div className="space-y-2 p-3">
          {sectionNumber ? (
            <>
              <Badge variant="secondary">Section {sectionNumber}</Badge>
              {isComplete && (
                <p className="text-xs text-muted-foreground">
                  Audio ready — play it in the Audio tab
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
