import { useQuery } from "@tanstack/react-query";

import { trpcOptions } from "#./lib/trpc-options.ts";

export function useChatList() {
	return useQuery(trpcOptions.chat.list.queryOptions());
}
