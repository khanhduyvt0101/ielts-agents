interface ReadingToolPartProps {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args: Record<string, unknown>;
}

export function renderReadingToolPart({
  toolName,
  state,
}: ReadingToolPartProps) {
  switch (toolName) {
    case "generate-passage": {
      if (state === "result") return <ToolStatus label="Passage generated" />;
      return <ToolStatus label="Generating passage..." />;
    }
    case "generate-questions": {
      if (state === "result") return <ToolStatus label="Questions generated" />;
      return <ToolStatus label="Generating questions..." />;
    }
    default:
      return null;
  }
}

function ToolStatus({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground my-2 text-sm italic">{label}</div>
  );
}
