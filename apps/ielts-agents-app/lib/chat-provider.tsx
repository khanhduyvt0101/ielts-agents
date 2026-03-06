import type { ChatInit } from "ai";
import type { IeltsAgentsMessage } from "ielts-agents-api/types";
import type { PropsWithChildren } from "react";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { apiURL } from "ielts-agents-internal-util";
import { useMemo } from "react";

import { ChatContext } from "#./lib/chat-context.ts";
import { handleUnknownError } from "#./lib/handle-unknown-error.ts";
import { queryClient } from "#./lib/query-client.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";

function createChat(
  id: number,
  messages: IeltsAgentsMessage[],
  onData: ChatInit<IeltsAgentsMessage>["onData"],
) {
  return new Chat({
    id: String(id),
    messages,
    transport: new DefaultChatTransport({
      api: `${apiURL}/v1/ai/chat/${id}/stream`,
      credentials: "include",
      prepareSendMessagesRequest: ({ api, credentials, body, messages }) => ({
        api,
        credentials,
        body: { ...body, messages },
      }),
      prepareReconnectToStreamRequest: ({ api, credentials }) => ({
        api,
        credentials,
      }),
    }),
    onData,
    onFinish: () => {
      void queryClient.invalidateQueries(
        trpcOptions.chat.getSuggestions.queryOptions({ id }),
      );
    },
    onError: handleUnknownError,
  });
}

interface ChatProviderProps extends PropsWithChildren {
  id: number;
  messages: IeltsAgentsMessage[];
  onData?: ChatInit<IeltsAgentsMessage>["onData"];
}

export function ChatProvider({
  children,
  id,
  messages,
  onData,
}: ChatProviderProps) {
  const chat = useMemo(
    () => createChat(id, messages, onData),
    [id, messages, onData],
  );
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
