import { queryClient } from "#./lib/query-client.ts";
import { sessionQueryOptions } from "#./lib/session-query-options.ts";

export async function getSession() {
  return queryClient.fetchQuery(sessionQueryOptions);
}
