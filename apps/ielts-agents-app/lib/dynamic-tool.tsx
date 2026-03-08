import type { IeltsAgentsToolPart } from "ielts-agents-api/types";

import { WrenchIcon } from "lucide-react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "~/components/ai-elements/tool";
import { cn } from "~/lib/utils";

import { isToolComplete } from "#./lib/is-tool-complete.ts";
import { SpinnerIcon } from "#./lib/spinner-icon.tsx";
import { Task } from "#./lib/task.tsx";

export interface DynamicToolProps {
  toolPart: IeltsAgentsToolPart;
}

function isValidationError(toolPart: IeltsAgentsToolPart): boolean {
  if (toolPart.state !== "output-error") return false;
  if (toolPart.input === undefined) return true;
  if (toolPart.errorText.startsWith("Invalid input for tool")) return true;
  return false;
}

export function DynamicTool({ toolPart }: DynamicToolProps) {
  const toolName = toolPart.type.replace("tool-", "");
  const isComplete = isToolComplete(toolPart.state);
  const isValidation = isValidationError(toolPart);
  return (
    <Task
      icon={
        isComplete ? (
          <WrenchIcon
            className={cn(
              "size-4",
              toolPart.state === "output-error" &&
                (isValidation ? "text-muted-foreground" : "text-destructive"),
            )}
          />
        ) : (
          <SpinnerIcon className="size-4" />
        )
      }
      isComplete={isComplete}
      label={toolName}
    >
      <div className="flex flex-col gap-3">
        <Tool>
          <ToolHeader
            state={toolPart.state}
            title={toolPart.title ?? toolName}
            type={toolPart.type}
          />
          <ToolContent>
            <ToolInput input={toolPart.input} />
            <ToolOutput
              errorText={toolPart.errorText}
              output={toolPart.output}
            />
          </ToolContent>
        </Tool>
      </div>
    </Task>
  );
}
