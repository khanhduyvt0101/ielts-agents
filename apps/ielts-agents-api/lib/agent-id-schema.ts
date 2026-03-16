import { z } from "zod";
import type { AgentId } from "#./lib/agent-id.ts";

import { agents } from "#./lib/agents.ts";

export const agentIdSchema = z.enum(
	Object.keys(agents) as [AgentId, ...AgentId[]],
);
