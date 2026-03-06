import type { ChatInit, ChatStatus } from "ai";
import type { AgentId, AgentMessage } from "ielts-agents-api/types";
import type { ComponentType } from "react";

import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import type { Route } from "#react-router/app/routes/+types/chat.ts";

import { useQuery } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import { AgentChatHeader } from "#./lib/agent-chat-header.tsx";
import { ChatProvider } from "#./lib/chat-provider.tsx";
import { Conversation } from "#./lib/conversation.tsx";
import { ProjectLayout } from "#./lib/project-layout.tsx";
import { projectOpenAtom } from "#./lib/project-open-atom.ts";
import { queryClient } from "#./lib/query-client.ts";
import { ReadingProject } from "#./lib/reading-project/index.tsx";
import { ReadingPromptInput } from "#./lib/reading-prompt-input.tsx";
import { renderReadingToolPart } from "#./lib/reading-tools/index.tsx";
import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChat } from "#./lib/use-chat.ts";

interface PromptInputProps {
  chatId: number;
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void;
}

interface DataInput<T extends AgentId> {
  id: number;
  data: Parameters<NonNullable<ChatInit<AgentMessage[T]>["onData"]>>[0];
}

interface AgentConfig<T extends AgentId> {
  onData: (data: DataInput<T>) => void;
  Project?: ComponentType<{ chatId: number }>;
  renderToolPart: (tool: any, message: any, chatId: number) => React.ReactNode;
  PromptInput: ComponentType<PromptInputProps>;
}

const agentConfigs: { [T in AgentId]: AgentConfig<T> } = {
  reading: {
    onData: () => {
      // Reading data comes through tool results in the stream
    },
    Project: ReadingProject,
    renderToolPart: (tool) =>
      renderReadingToolPart({
        toolName: tool.toolName,
        state: tool.state ?? "call",
        args: tool.args ?? {},
      }),
    PromptInput: ({ chatId, status, onSubmit }) => (
      <ReadingPromptInput chatId={chatId} status={status} onSubmit={onSubmit} />
    ),
  },
};

const agentIds = Object.keys(agentConfigs) as AgentId[];

function UnifiedAgentChat({
  id,
  agentId,
  config,
}: {
  id: number;
  agentId: AgentId;
  config: AgentConfig<AgentId>;
}) {
  const { messages, status, sendMessage } = useChat({
    resume: true,
  });
  const { Project, renderToolPart, PromptInput } = config;
  return (
    <ProjectLayout
      chatHeader={<AgentChatHeader agent={agentId} chatId={id} />}
      chatPanel={
        <div className="flex h-full flex-col overflow-hidden">
          <Conversation
            chatId={id}
            messages={messages}
            renderToolPart={renderToolPart}
            status={status}
          />
          <div className="shrink-0 px-4 pb-4">
            <div className="mx-auto w-full max-w-5xl">
              <PromptInput
                chatId={id}
                status={status}
                onSubmit={(message) => {
                  void sendMessage(message);
                  dispatchEvent(new ScrollToBottomConversationEvent());
                }}
              />
            </div>
          </div>
        </div>
      }
      projectPanel={Project ? <Project chatId={id} /> : undefined}
    />
  );
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const store = getDefaultStore();
  store.set(projectOpenAtom, true);
  store.set(sidebarOpenAtom, false);
  await queryClient.prefetchQuery(
    trpcOptions.chat.get.queryOptions({ id: Number(params.id) }),
  );
}

export default function Component({ params }: Route.ComponentProps) {
  const { data, isError, isRefetching, refetch, error } = useQuery(
    trpcOptions.chat.get.queryOptions({ id: Number(params.id) }),
  );
  if (data) {
    for (const agentId of agentIds) {
      const agentData = data[agentId];
      if (agentData) {
        const config = agentConfigs[agentId];
        const messages = data.messages as AgentMessage[typeof agentId][];
        return (
          <ChatProvider
            id={agentData.id}
            messages={messages}
            onData={(onDataPayload) => {
              config.onData({ id: agentData.id, data: onDataPayload });
            }}
          >
            <UnifiedAgentChat
              agentId={agentId}
              config={config}
              id={agentData.id}
            />
          </ChatProvider>
        );
      }
    }
  }
  if (isError) {
    return (
      <div className="flex size-full items-center justify-center">
        <RetryErrorAlert
          error={error}
          isRefetching={isRefetching}
          refetch={refetch}
          title="Failed to load chat"
        />
      </div>
    );
  }
}
