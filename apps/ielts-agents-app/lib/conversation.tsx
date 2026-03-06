import type { ChatStatus } from "ai";
import type {
  AgentId,
  AgentMessage,
  IeltsAgentsMessage,
  IeltsAgentsTextPart,
  IeltsAgentsToolPart,
} from "ielts-agents-api/types";

import type { AgentRenderToolPart } from "#./lib/agent-render-tool-part.ts";

import { Fragment, useDeferredValue, useRef } from "react";

import {
  Conversation as ConversationRoot,
  ConversationContent,
  ConversationScrollButton,
} from "~/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "~/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "~/components/ai-elements/reasoning";

import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import { StreamingIndicator } from "#./lib/streaming-indicator.tsx";
import { Suggestions } from "#./lib/suggestions.tsx";
import { useCustomEvent } from "#./lib/use-custom-event.ts";

type MessageSegment =
  | { type: "reasoning"; text: string }
  | { type: "text"; text: string }
  | { type: "tool"; toolPart: IeltsAgentsToolPart };

function groupMessagePartsIntoSegments(
  message: IeltsAgentsMessage,
): MessageSegment[] {
  const segments: MessageSegment[] = [];
  for (const part of message.parts) {
    if (part.type === "reasoning" && part.text) {
      const lastSegment = segments.at(-1);
      if (lastSegment?.type === "reasoning")
        lastSegment.text = [lastSegment.text, part.text].join("\n\n");
      else segments.push({ type: "reasoning", text: part.text });
    } else if (part.type === "text" && part.text) {
      segments.push({ type: "text", text: part.text });
    } else if (part.type.startsWith("tool-")) {
      segments.push({ type: "tool", toolPart: part as IeltsAgentsToolPart });
    }
  }
  return segments;
}

interface DeferredMessageResponseProps {
  text: string;
}

function DeferredMessageResponse({ text }: DeferredMessageResponseProps) {
  const deferredText = useDeferredValue(text);
  return <MessageResponse>{deferredText}</MessageResponse>;
}

interface UserMessageProps {
  message: IeltsAgentsMessage;
}

function UserMessage({ message }: UserMessageProps) {
  const fileParts = message.parts.filter((part) => part.type === "file");
  const textParts = message.parts.filter(
    (part): part is IeltsAgentsTextPart => part.type === "text",
  );
  const hasAttachments = fileParts.length > 0;
  return (
    <div className="flex w-full flex-col gap-4">
      {hasAttachments && (
        <MessageAttachments>
          {fileParts.map((part, idx) => (
            <MessageAttachment key={`${message.id}-file-${idx}`} data={part} />
          ))}
        </MessageAttachments>
      )}
      {textParts.map((part, partIndex) => (
        <Message key={`${message.id}-${partIndex}`} from="user">
          <MessageContent>
            <DeferredMessageResponse text={part.text} />
          </MessageContent>
        </Message>
      ))}
    </div>
  );
}

type InferConversationProps = {
  [T in AgentId]: {
    chatId: number;
    status: ChatStatus;
    messages: AgentMessage[T][];
    renderToolPart: AgentRenderToolPart[T];
  };
};

export type ConversationProps = InferConversationProps["reading"];

interface AssistantMessageProps {
  chatId: number;
  index: number;
  messages: IeltsAgentsMessage[];
  status: ChatStatus;
  renderToolPart: (
    tool: IeltsAgentsToolPart,
    message: IeltsAgentsMessage,
    chatId: number,
  ) => React.ReactNode;
}

function AssistantMessage({
  chatId,
  index,
  messages,
  status,
  renderToolPart,
}: AssistantMessageProps) {
  const isLastMessage = index === messages.length - 1;
  const isStreamingMessage =
    (status === "streaming" || status === "submitted") && isLastMessage;
  const showSuggestions = isLastMessage && status === "ready";
  const message = messages[index];
  const segments = groupMessagePartsIntoSegments(message);
  return (
    <div className="flex w-full flex-col gap-4">
      {segments.map((segment, segmentIndex) => {
        const segmentKey = `segment-${segmentIndex}`;
        const isLastSegment = segmentIndex === segments.length - 1;
        const isStreamingSegment = isStreamingMessage && isLastSegment;
        if (segment.type === "reasoning") {
          return (
            <Reasoning
              key={segmentKey}
              className="mb-0"
              isStreaming={isStreamingSegment}
            >
              <ReasoningTrigger />
              <ReasoningContent>{segment.text}</ReasoningContent>
            </Reasoning>
          );
        }
        if (segment.type === "tool") {
          return (
            <Fragment key={segmentKey}>
              {renderToolPart(segment.toolPart, message, chatId)}
            </Fragment>
          );
        }
        return (
          <Message key={segmentKey} className="max-w-full" from="assistant">
            <MessageContent>
              <DeferredMessageResponse text={segment.text} />
            </MessageContent>
          </Message>
        );
      })}
      {showSuggestions && <Suggestions chatId={chatId} />}
    </div>
  );
}

export function Conversation({
  chatId,
  messages,
  status,
  renderToolPart,
}: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useCustomEvent(
    () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [],
    ScrollToBottomConversationEvent,
  );
  return (
    <ConversationRoot className="min-h-0 flex-1">
      <ConversationContent className="mx-auto w-full max-w-4xl px-4 pb-24">
        {messages.map((message, index) =>
          message.role === "assistant" ? (
            <AssistantMessage
              key={message.id}
              chatId={chatId}
              index={index}
              messages={messages}
              renderToolPart={
                renderToolPart as AssistantMessageProps["renderToolPart"]
              }
              status={status}
            />
          ) : (
            <UserMessage key={message.id} message={message} />
          ),
        )}
        {(status === "streaming" || status === "submitted") && (
          <StreamingIndicator />
        )}
        <div ref={bottomRef} />
      </ConversationContent>
      <ConversationScrollButton />
    </ConversationRoot>
  );
}
