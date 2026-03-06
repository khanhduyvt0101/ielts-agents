import type { SessionData } from "#./lib/session-data.ts";
import type { WorkspaceData } from "#./lib/workspace-data.ts";

import { createContext } from "react-router";

export interface MainContextData {
  sessionData: SessionData;
  workspaceData: WorkspaceData;
}

export const mainContext = createContext<MainContextData>();
