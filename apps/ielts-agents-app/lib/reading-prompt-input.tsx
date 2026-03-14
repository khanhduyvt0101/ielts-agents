import type { ChatStatus } from "ai";
import type { BandScore } from "ielts-agents-api/types";

import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "ielts-agents-internal-util";
import { useState } from "react";

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
import { Button } from "~/components/ui/button";

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
          disabled={disabled ?? isLoading}
          placeholder={placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter className="flex-wrap justify-end gap-2 sm:justify-between">
        <PromptInputTools className="flex-wrap justify-end gap-2">
          <BandScoreSelector chatId={chatId} disabled={disabled ?? isLoading} />
        </PromptInputTools>
        <div className="flex items-center gap-1">
          <PromptInputSubmit
            disabled={disabled ?? isLoading}
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
  const [localBandScore, setLocalBandScore] = useState<BandScore>("6.5");
  const { data, isPending, isError, error, isRefetching, refetch } = useQuery(
    trpcOptions.reading.getReadingConfig.queryOptions(
      { chatId: chatId ?? "" },
      { enabled: !!chatId },
    ),
  );
  const updateConfig = useMutation(
    trpcOptions.reading.updateConfig.mutationOptions(),
  );

  if (chatId && isPending) {
    return (
      <PromptInputSelect disabled value="6.5">
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

  if (chatId && isError) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">
          {getErrorMessage(error)}
        </span>
        <Button
          disabled={isRefetching}
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const value = chatId ? (data?.bandScore ?? "6.5") : localBandScore;
  return (
    <PromptInputSelect
      disabled={disabled ?? updateConfig.isPending}
      value={value}
      onValueChange={(bandScore: string) => {
        if (chatId) {
          updateConfig.mutate({ chatId, bandScore: bandScore as BandScore });
        } else {
          setLocalBandScore(bandScore as BandScore);
          updateConfig.mutate({ bandScore: bandScore as BandScore });
        }
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
