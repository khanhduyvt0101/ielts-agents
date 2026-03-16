import { createContext } from "react-router";
import type { SessionData } from "#./lib/session-data.ts";
import type { WorkspaceData } from "#./lib/workspace-data.ts";

export interface MainContextData {
	sessionData: SessionData;
	workspaceData: WorkspaceData;
}

export const mainContext = createContext<MainContextData>();
