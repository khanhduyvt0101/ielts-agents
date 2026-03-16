import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { TRPCRouter } from "ielts-agents-api/types";

import { queryClient } from "#./lib/query-client.ts";
import { trpcClient } from "#./lib/trpc-client.ts";

export const trpcOptions = createTRPCOptionsProxy<TRPCRouter>({
	client: trpcClient,
	queryClient,
});
