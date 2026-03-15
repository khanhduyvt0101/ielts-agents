import "#./lib/sentry.ts";

import type {
  AnyUseMutationOptions,
  AnyUseQueryOptions,
} from "@tanstack/react-query";

import { getErrorMessage } from "ielts-agents-internal-util";
import { getDefaultStore } from "jotai";
import { toast } from "sonner";

import { createListeningChatMutationOptions } from "#./lib/create-listening-chat-mutation-options.ts";
import { createReadingChatMutationOptions } from "#./lib/create-reading-chat-mutation-options.ts";
import { createWritingChatMutationOptions } from "#./lib/create-writing-chat-mutation-options.ts";
import { locationAtom } from "#./lib/location-atom.ts";
import { navigateAtom } from "#./lib/navigate-atom.ts";
import { navigateToExternalURL } from "#./lib/navigate-to-external-url.ts";
import { navigationCountAtom } from "#./lib/navigation-count-atom.ts";
import { queryClient } from "#./lib/query-client.ts";
import { revalidateAtom } from "#./lib/revalidate-atom.ts";
import { sessionQueryOptions } from "#./lib/session-query-options.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";

function mutationDefaults(mutationOptions: AnyUseMutationOptions) {
  queryClient.setMutationDefaults(
    mutationOptions.mutationKey as unknown[],
    mutationOptions,
  );
}

mutationDefaults(
  trpcOptions.billing.manage.mutationOptions({
    onSuccess: async (url) => {
      await navigateToExternalURL(url);
    },
    onError: (error) => {
      toast.error("Failed to manage billing", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.billing.update.mutationOptions({
    onSuccess: async (url) => {
      if (url) {
        await navigateToExternalURL(url);
      } else {
        await queryClient.invalidateQueries(
          trpcOptions.workspace.sync.queryOptions(),
        );
        const store = getDefaultStore();
        await store.set(revalidateAtom);
        toast.success("Updated subscription successfully");
      }
    },
    onError: (error) => {
      toast.error("Failed to update subscription", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.chat.delete.mutationOptions({
    onMutate() {
      const toastId = toast.loading("Deleting chat...");
      const store = getDefaultStore();
      const navigationCount = store.get(navigationCountAtom);
      return { navigationCount, toastId };
    },
    onSuccess: async (data, variables, { navigationCount, toastId }) => {
      await queryClient.invalidateQueries(trpcOptions.chat.list.queryOptions());
      const store = getDefaultStore();
      const location = store.get(locationAtom);
      if (location.pathname === `/chat/${data.id}`)
        await store.set(navigateAtom, "/", { navigationCount });
      toast.success("Deleted chat", { id: toastId });
    },
    onError: (error, variables, onMutateResult) => {
      toast.error("Failed to delete chat", {
        description: getErrorMessage(error),
        id: onMutateResult?.toastId,
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.chat.updateChatName.mutationOptions({
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries(trpcOptions.chat.list.queryOptions()),
        queryClient.invalidateQueries(
          trpcOptions.chat.getChatConfig.queryOptions({ id: variables.id }),
        ),
      ]);
    },
    onError: (error) => {
      toast.error("Failed to update chat name", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(createReadingChatMutationOptions);

mutationDefaults(createListeningChatMutationOptions);

mutationDefaults(createWritingChatMutationOptions);

mutationDefaults(
  trpcOptions.listening.updateConfig.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        variables.chatId
          ? trpcOptions.listening.getListeningConfig.queryOptions({
              chatId: variables.chatId,
            })
          : trpcOptions.listening.getDefaultConfig.queryOptions(),
      );
    },
    onError: (error) => {
      toast.error("Failed to update config", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.listening.saveAnswer.mutationOptions({
    onError: (error) => {
      toast.error("Failed to save answer", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.listening.submitSession.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.listening.getListeningData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to submit answers", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.listening.retakeSession.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.listening.getListeningData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to start retake", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.reading.updateConfig.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        variables.chatId
          ? trpcOptions.reading.getReadingConfig.queryOptions({
              chatId: variables.chatId,
            })
          : trpcOptions.reading.getDefaultConfig.queryOptions(),
      );
    },
    onError: (error) => {
      toast.error("Failed to update config", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.reading.saveAnswer.mutationOptions({
    onError: (error) => {
      toast.error("Failed to save answer", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.reading.submitSession.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.reading.getReadingData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to submit answers", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.reading.retakeSession.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.reading.getReadingData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to start retake", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.reading.saveVocabulary.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.reading.getReadingData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to save vocabulary", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.writing.updateConfig.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        variables.chatId
          ? trpcOptions.writing.getWritingConfig.queryOptions({
              chatId: variables.chatId,
            })
          : trpcOptions.writing.getDefaultConfig.queryOptions(),
      );
    },
    onError: (error) => {
      toast.error("Failed to update config", {
        description: getErrorMessage(error),
      });
    },
  }),
);

mutationDefaults(
  trpcOptions.writing.submitEssay.mutationOptions({
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries(
        trpcOptions.writing.getWritingData.queryOptions({
          chatId: variables.chatId,
        }),
      );
    },
    onError: (error) => {
      toast.error("Failed to submit essay", {
        description: getErrorMessage(error),
      });
    },
  }),
);

function queryInput<T>(): T {
  return {} as T;
}

function queryDefaults(queryOptions: AnyUseQueryOptions) {
  const queryKey = queryOptions.queryKey as unknown[];
  queryClient.setQueryDefaults(
    queryKey.length > 1 ? queryKey.slice(0, -1) : queryKey,
    queryOptions,
  );
}

queryDefaults(sessionQueryOptions);

queryDefaults(trpcOptions.workspace.sync.queryOptions());

queryDefaults(trpcOptions.chat.list.queryOptions());

queryDefaults(
  trpcOptions.chat.get.queryOptions(queryInput(), {
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }),
);

queryDefaults(trpcOptions.chat.getChatConfig.queryOptions(queryInput()));

queryDefaults(trpcOptions.chat.getAgentConfig.queryOptions(queryInput()));

queryDefaults(trpcOptions.chat.getSuggestions.queryOptions(queryInput()));

queryDefaults(trpcOptions.reading.getReadingData.queryOptions(queryInput()));

queryDefaults(trpcOptions.reading.getReadingConfig.queryOptions(queryInput()));

queryDefaults(
  trpcOptions.listening.getListeningData.queryOptions(queryInput()),
);

queryDefaults(
  trpcOptions.listening.getListeningConfig.queryOptions(queryInput()),
);

queryDefaults(trpcOptions.reading.getDefaultConfig.queryOptions());

queryDefaults(trpcOptions.listening.getDefaultConfig.queryOptions());

queryDefaults(trpcOptions.writing.getWritingData.queryOptions(queryInput()));

queryDefaults(trpcOptions.writing.getWritingConfig.queryOptions(queryInput()));

queryDefaults(trpcOptions.writing.getDefaultConfig.queryOptions());
