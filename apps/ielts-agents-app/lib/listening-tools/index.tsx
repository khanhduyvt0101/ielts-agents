import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { DynamicTool } from "#./lib/dynamic-tool.tsx";
import { toolSettings } from "#./lib/tool-settings.ts";

import { ExtractVocabularyTool } from "./extract-vocabulary-tool.tsx";
import { GenerateAudioTool } from "./generate-audio-tool.tsx";
import { GenerateQuestionsTool } from "./generate-questions-tool.tsx";
import { GenerateScriptTool } from "./generate-script-tool.tsx";

export const renderListeningToolPart: AgentRenderToolPart["listening"] = (
	toolPart,
) => {
	const setting = toolSettings.listening[toolPart.type];
	if (setting?.hidden) return;

	switch (toolPart.type) {
		case "tool-generate-script": {
			return <GenerateScriptTool toolPart={toolPart} />;
		}
		case "tool-generate-audio": {
			return <GenerateAudioTool toolPart={toolPart} />;
		}
		case "tool-generate-listening-questions": {
			return <GenerateQuestionsTool toolPart={toolPart} />;
		}
		case "tool-extract-vocabulary": {
			return <ExtractVocabularyTool toolPart={toolPart} />;
		}
		default: {
			return <DynamicTool toolPart={toolPart} />;
		}
	}
};
