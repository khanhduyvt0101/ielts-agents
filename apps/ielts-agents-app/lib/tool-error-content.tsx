import type { IeltsAgentsToolPart } from "ielts-agents-api/types";

import { AlertCircleIcon, InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

export interface ToolErrorContentProps {
  title: string;
  description?: string;
  toolPart?: IeltsAgentsToolPart;
}

function isValidationError(toolPart?: IeltsAgentsToolPart): boolean {
  if (!toolPart || toolPart.state !== "output-error") return false;
  if (toolPart.input === undefined) return true;
  if (toolPart.errorText.startsWith("Invalid input for tool")) return true;
  return false;
}

export function ToolErrorContent({
  title,
  description,
  toolPart,
}: ToolErrorContentProps) {
  const isValidation = isValidationError(toolPart);
  return (
    <Alert
      className={cn(
        isValidation &&
          "border-muted-foreground/20 bg-muted/50 text-muted-foreground *:data-[slot=alert-description]:text-muted-foreground/80",
      )}
      variant={isValidation ? "default" : "destructive"}
    >
      {isValidation ? (
        <InfoIcon className="size-4" />
      ) : (
        <AlertCircleIcon className="size-4" />
      )}
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
    </Alert>
  );
}
