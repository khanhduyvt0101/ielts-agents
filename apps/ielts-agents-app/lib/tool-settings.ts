import type { AgentId, IeltsAgentsToolPart } from "ielts-agents-api/types";

interface ToolSetting {
  hidden: boolean;
}

type AgentToolSettings = Partial<
  Record<IeltsAgentsToolPart["type"], ToolSetting>
>;

export const toolSettings: Record<AgentId, AgentToolSettings> = {
  reading: {
    "tool-suggestions": { hidden: true },
    "tool-get-reading-results": { hidden: true },
  },
  listening: {
    "tool-suggestions": { hidden: true },
    "tool-get-listening-results": { hidden: true },
  },
  writing: {
    "tool-suggestions": { hidden: true },
    "tool-get-writing-results": { hidden: true },
  },
  speaking: {
    "tool-suggestions": { hidden: true },
    "tool-get-speaking-results": { hidden: true },
  },
};
