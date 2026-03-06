import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";

import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";

import { trpcOptions } from "#./lib/trpc-options.ts";

const bandScores: BandScore[] = [
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
  "7.5",
  "8.0",
  "8.5",
  "9.0",
];

interface ReadingPromptInputContentProps {
  chatId?: number;
  status?: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (message: PromptInputMessage) => Promise<void> | void;
  className?: string;
}

function ReadingPromptInputContent({
  chatId,
  status,
  disabled,
  placeholder = "Ask about the reading test...",
  onSubmit,
  className,
}: ReadingPromptInputContentProps) {
  const isLoading = status === "streaming" || status === "submitted";

  return (
    <PromptInput className={className} onSubmit={onSubmit}>
      <PromptInputBody>
        <PromptInputTextarea
          className="disabled:cursor-text"
          disabled={disabled || isLoading}
          placeholder={placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter className="flex-wrap justify-end gap-2 sm:justify-between">
        <PromptInputTools className="flex-wrap justify-end gap-2">
          <BandScoreSelector chatId={chatId} disabled={disabled || isLoading} />
        </PromptInputTools>
        <div className="flex items-center gap-1">
          <PromptInputSubmit
            disabled={disabled || isLoading}
            status={isLoading ? "submitted" : "ready"}
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}

interface ReadingPromptInputProps extends ReadingPromptInputContentProps {
  externalProvider?: boolean;
}

export function ReadingPromptInput({
  externalProvider,
  ...props
}: ReadingPromptInputProps) {
  if (externalProvider) return <ReadingPromptInputContent {...props} />;

  return (
    <PromptInputProvider>
      <ReadingPromptInputContent {...props} />
    </PromptInputProvider>
  );
}

function BandScoreSelector({
  chatId,
  disabled,
}: {
  chatId?: number;
  disabled?: boolean;
}) {
  const { data } = useQuery(
    trpcOptions.reading.getReadingConfig.queryOptions(
      { chatId: chatId! },
      { enabled: !!chatId },
    ),
  );
  const updateConfig = useMutation(
    trpcOptions.reading.updateConfig.mutationOptions(),
  );
  const value = data?.bandScore ?? "6.5";
  return (
    <PromptInputSelect
      disabled={disabled || updateConfig.isPending}
      value={value}
      onValueChange={(bandScore: string) => {
        if (chatId)
          updateConfig.mutate({ chatId, bandScore: bandScore as BandScore });
        else updateConfig.mutate({ bandScore: bandScore as BandScore });
      }}
    >
      <PromptInputSelectTrigger className="w-auto gap-1">
        <PromptInputSelectValue />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {bandScores.map((score) => (
          <PromptInputSelectItem key={score} value={score}>
            Band {score}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}
