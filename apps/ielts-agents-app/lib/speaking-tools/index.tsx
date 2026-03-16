import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { DynamicTool } from "#./lib/dynamic-tool.tsx";
import { toolSettings } from "#./lib/tool-settings.ts";

import { EvaluateSpeakingTool } from "./evaluate-speaking-tool.tsx";

export const renderSpeakingToolPart: AgentRenderToolPart["speaking"] = (
	toolPart,
) => {
	const setting = toolSettings.speaking[toolPart.type];
	if (setting?.hidden) return;

	switch (toolPart.type) {
		case "tool-evaluate-speaking": {
			return <EvaluateSpeakingTool toolPart={toolPart} />;
		}
		default: {
			return <DynamicTool toolPart={toolPart} />;
		}
	}
};
