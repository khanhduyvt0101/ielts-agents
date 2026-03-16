import { authProcedure } from "#./lib/auth-procedure.ts";
import { syncWorkspace } from "#./lib/sync-workspace.ts";

export const workspaceProcedure = authProcedure.use(
	async ({ ctx: { user }, next }) => {
		const workspace = await syncWorkspace({ userId: user.id });
		return next({ ctx: { workspace } });
	},
);
