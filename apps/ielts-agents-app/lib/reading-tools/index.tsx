import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { DynamicTool } from "#./lib/dynamic-tool.tsx";
import { toolSettings } from "#./lib/tool-settings.ts";

import { GeneratePassageTool } from "./generate-passage-tool.tsx";
import { GenerateQuestionsTool } from "./generate-questions-tool.tsx";

export const renderReadingToolPart: AgentRenderToolPart["reading"] = (
  toolPart,
) => {
  const setting = toolSettings.reading[toolPart.type];
  if (setting?.hidden) return;

  switch (toolPart.type) {
    case "tool-generate-passage": {
      return <GeneratePassageTool toolPart={toolPart} />;
    }
    case "tool-generate-questions": {
      return <GenerateQuestionsTool toolPart={toolPart} />;
    }
    default: {
      return <DynamicTool toolPart={toolPart} />;
    }
  }
};
