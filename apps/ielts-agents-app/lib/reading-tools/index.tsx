import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

export const renderReadingToolPart: AgentRenderToolPart["reading"] = (
  toolPart,
) => {
  switch (toolPart.type) {
    case "tool-generate-passage": {
      if (toolPart.state === "output-available")
        return <ToolStatus label="Passage generated" />;
      return <ToolStatus label="Generating passage..." />;
    }
    case "tool-generate-questions": {
      if (toolPart.state === "output-available")
        return <ToolStatus label="Questions generated" />;
      return <ToolStatus label="Generating questions..." />;
    }
    default: {
      return null;
    }
  }
};

function ToolStatus({ label }: { label: string }) {
  return (
    <div className="my-2 text-sm text-muted-foreground italic">{label}</div>
  );
}
