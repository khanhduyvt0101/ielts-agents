import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { TRPCRouter } from "ielts-agents-api/types";
import { apiURL } from "ielts-agents-internal-util";
import { SuperJSON } from "superjson";

export const trpcClient = createTRPCClient<TRPCRouter>({
	links: [
		httpBatchLink({
			url: `${apiURL}/v1/trpc`,
			transformer: SuperJSON,
			fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
		}),
	],
});
