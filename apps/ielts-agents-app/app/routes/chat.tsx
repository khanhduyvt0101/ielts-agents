import type { ChatInit } from "ai";
import type { AgentId, AgentMessage } from "ielts-agents-api/types";
import type { ComponentType } from "react";

import type { Route } from "#react-router/app/routes/+types/chat.ts";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { useQuery } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import { AgentChatHeader } from "#./lib/agent-chat-header.tsx";
import { ChatProvider } from "#./lib/chat-provider.tsx";
import { Conversation } from "#./lib/conversation.tsx";
import { ListeningProject } from "#./lib/listening-project/index.tsx";
import { ListeningPromptInput } from "#./lib/listening-prompt-input.tsx";
import { renderListeningToolPart } from "#./lib/listening-tools/index.tsx";
import { ProjectLayout } from "#./lib/project-layout.tsx";
import { projectOpenAtom } from "#./lib/project-open-atom.ts";
import { queryClient } from "#./lib/query-client.ts";
import { ReadingProject } from "#./lib/reading-project/index.tsx";
import { ReadingPromptInput } from "#./lib/reading-prompt-input.tsx";
import { renderReadingToolPart } from "#./lib/reading-tools/index.tsx";
import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { SpeakingProject } from "#./lib/speaking-project/index.tsx";
import { SpeakingPromptInput } from "#./lib/speaking-prompt-input.tsx";
import { renderSpeakingToolPart } from "#./lib/speaking-tools/index.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import { useChat } from "#./lib/use-chat.ts";
import { WritingProject } from "#./lib/writing-project/index.tsx";
import { WritingPromptInput } from "#./lib/writing-prompt-input.tsx";
import { renderWritingToolPart } from "#./lib/writing-tools/index.tsx";

interface PromptInputProps {
  chatId: number;
  isLoading: boolean;
  onSubmit: (message: PromptInputMessage) => void;
}

interface DataInput<T extends AgentId> {
  id: number;
  data: Parameters<NonNullable<ChatInit<AgentMessage[T]>["onData"]>>[0];
}

interface AgentConfig<T extends AgentId> {
  onData: (data: DataInput<T>) => void;
  Project?: ComponentType<{ chatId: number }>;
  renderToolPart: AgentRenderToolPart[T];
  PromptInput: ComponentType<PromptInputProps>;
}

const agentConfigs: { [T in AgentId]: AgentConfig<T> } = {
  reading: {
    onData: ({ id }) => {
      void queryClient.invalidateQueries(
        trpcOptions.reading.getReadingData.queryOptions({ chatId: id }),
      );
      void queryClient.invalidateQueries(
        trpcOptions.chat.getAgentConfig.queryOptions({ chatId: id }),
      );
    },
    Project: ReadingProject,
    renderToolPart: renderReadingToolPart,
    PromptInput: ReadingPromptInput,
  },
  listening: {
    onData: ({ id }) => {
      void queryClient.invalidateQueries(
        trpcOptions.listening.getListeningData.queryOptions({ chatId: id }),
      );
      void queryClient.invalidateQueries(
        trpcOptions.chat.getAgentConfig.queryOptions({ chatId: id }),
      );
    },
    Project: ListeningProject,
    renderToolPart: renderListeningToolPart,
    PromptInput: ListeningPromptInput,
  },
  writing: {
    onData: ({ id }) => {
      void queryClient.invalidateQueries(
        trpcOptions.writing.getWritingData.queryOptions({ chatId: id }),
      );
      void queryClient.invalidateQueries(
        trpcOptions.chat.getAgentConfig.queryOptions({ chatId: id }),
      );
    },
    Project: WritingProject,
    renderToolPart: renderWritingToolPart,
    PromptInput: WritingPromptInput,
  },
  speaking: {
    onData: ({ id }) => {
      void queryClient.invalidateQueries(
        trpcOptions.speaking.getSpeakingData.queryOptions({ chatId: id }),
      );
      void queryClient.invalidateQueries(
        trpcOptions.chat.getAgentConfig.queryOptions({ chatId: id }),
      );
    },
    Project: SpeakingProject,
    renderToolPart: renderSpeakingToolPart,
    PromptInput: SpeakingPromptInput,
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
  const { messages, status, isLoading, sendMessage } = useChat({
    resume: true,
  });
  const { Project, renderToolPart, PromptInput } = config;
  return (
    <ProjectLayout
      chatHeader={<AgentChatHeader agent={agentId} chatId={id} />}
      chatPanel={
        <div className="flex h-full flex-col overflow-hidden">
          {/* @ts-ignore Agent union types are compatible at runtime */}
          <Conversation
            chatId={id}
            // @ts-ignore Agent message types vary per agent
            messages={messages}
            // @ts-ignore Agent tool part types vary per agent
            renderToolPart={renderToolPart}
            status={status}
          />
          <div className="shrink-0 px-4 pb-4">
            <div className="mx-auto w-full max-w-5xl">
              <PromptInput
                chatId={id}
                isLoading={isLoading}
                onSubmit={(msg) => {
                  void sendMessage(msg);
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
  const { data, isPending, isError, isRefetching, refetch, error } = useQuery(
    trpcOptions.chat.get.queryOptions({ id: Number(params.id) }),
  );

  if (isPending) return null;

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

  for (const agentId of agentIds) {
    const agentData = data[agentId];
    if (agentData) {
      const config = agentConfigs[agentId];
      const messages = data.messages as AgentMessage[typeof agentId][];
      return (
        <ChatProvider
          id={agentData.id}
          messages={messages}
          onData={(data) => {
            config.onData({ id: agentData.id, data });
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
