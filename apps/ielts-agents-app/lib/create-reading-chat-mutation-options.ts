import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import { mutationOptions } from "@tanstack/react-query";
import { getErrorMessage } from "ielts-agents-internal-util";
import { getDefaultStore } from "jotai";
import { toast } from "sonner";

import { navigateAtom } from "#./lib/navigate-atom.ts";
import { navigationCountAtom } from "#./lib/navigation-count-atom.ts";
import { queryClient } from "#./lib/query-client.ts";
import { trpcClient } from "#./lib/trpc-client.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { updateChatNameMutationAtom } from "#./lib/update-chat-name-mutation-atom.ts";

export const createReadingChatMutationOptions = mutationOptions({
  mutationKey: ["createReadingChat"],
  mutationFn: async ({ text }: PromptInputMessage) =>
    trpcClient.reading.createReading.mutate({
      prompt: text.trim(),
    }),
  onMutate: () => {
    const store = getDefaultStore();
    const navigationCount = store.get(navigationCountAtom);
    const toastId = toast.loading("Creating chat...");
    return { navigationCount, toastId };
  },
  onSuccess: async (data, _variables, context) => {
    await queryClient.invalidateQueries(trpcOptions.chat.list.queryOptions());
    const store = getDefaultStore();
    await store.set(navigateAtom, `/chat/${data.id}`, {
      navigationCount: context.navigationCount,
    });
    store.get(updateChatNameMutationAtom).mutate({ id: data.id });
    toast.success("Created chat", { id: context.toastId });
  },
  onError: (error, _variables, context) => {
    toast.error("Failed to create chat", {
      description: getErrorMessage(error),
      id: context?.toastId,
    });
  },
});
