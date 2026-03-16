import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { DynamicTool } from "#./lib/dynamic-tool.tsx";
import { toolSettings } from "#./lib/tool-settings.ts";

import { EvaluateEssayTool } from "./evaluate-essay-tool.tsx";
import { GenerateTaskTool } from "./generate-task-tool.tsx";

export const renderWritingToolPart: AgentRenderToolPart["writing"] = (
	toolPart,
) => {
	const setting = toolSettings.writing[toolPart.type];
	if (setting?.hidden) return;

	switch (toolPart.type) {
		case "tool-generate-task": {
			return <GenerateTaskTool toolPart={toolPart} />;
		}
		case "tool-evaluate-essay": {
			return <EvaluateEssayTool toolPart={toolPart} />;
		}
		default: {
			return <DynamicTool toolPart={toolPart} />;
		}
	}
};
