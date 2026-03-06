import { atomWithMutation } from "jotai-tanstack-query";

import { trpcOptions } from "#./lib/trpc-options.ts";

export const updateChatNameMutationAtom = atomWithMutation(() =>
  trpcOptions.chat.updateChatName.mutationOptions(),
);
