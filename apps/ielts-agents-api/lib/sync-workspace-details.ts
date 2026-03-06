import type { syncWorkspace } from "#./lib/sync-workspace.ts";

export type SyncWorkspaceDetails = Awaited<ReturnType<typeof syncWorkspace>>;
