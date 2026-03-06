import { defaultAuthQueryOptions } from "@daveyplate/better-auth-tanstack";
import { queryOptions } from "@tanstack/react-query";

import { authClient } from "#./lib/auth-client.ts";

export const sessionQueryOptions = queryOptions({
  queryKey: defaultAuthQueryOptions.sessionKey,
  queryFn: () => authClient.getSession({ fetchOptions: { throw: true } }),
  staleTime: 60 * 1000,
});
