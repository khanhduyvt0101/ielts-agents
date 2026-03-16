import { Outlet } from "react-router";
import { authenticate } from "#./lib/authenticate.ts";
import { mainContext } from "#./lib/main-context.ts";
import { MainLayout } from "#./lib/main-layout/index.tsx";
import { queryClient } from "#./lib/query-client.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";
import type { Route } from "#react-router/app/layouts/+types/main.ts";

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
	async ({ request, context }) => {
		const sessionData = await authenticate(request.url);
		const workspaceData = await queryClient.fetchQuery(
			trpcOptions.workspace.sync.queryOptions(),
		);
		context.set(mainContext, { sessionData, workspaceData });
	},
];

export default function Component() {
	return (
		<MainLayout>
			<Outlet />
		</MainLayout>
	);
}
