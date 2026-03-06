import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";

import { useMutation } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import {
  PromptInputProvider,
  usePromptInputController,
} from "~/components/ai-elements/prompt-input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "~/components/ui/breadcrumb";

import { PageHeader } from "#./lib/page-header.tsx";
import { ReadingPromptInput } from "#./lib/reading-prompt-input.tsx";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { SuggestionPrompts } from "#./lib/suggestion-prompts.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";

const READING_SUGGESTIONS = [
  "Climate change and its effects on marine ecosystems",
  "The history and evolution of artificial intelligence",
  "Space exploration and the colonization of Mars",
  "The impact of social media on modern communication",
];

export function clientLoader() {
  const store = getDefaultStore();
  store.set(sidebarOpenAtom, true);
}

function ReadingContent({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (message: PromptInputMessage) => Promise<void> | void;
}) {
  const { textInput } = usePromptInputController();

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">
        IELTS Reading Test Generator
      </h1>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
        Generate practice IELTS reading tests on any topic
      </p>
      <div className="w-full max-w-xl">
        <ReadingPromptInput
          externalProvider
          disabled={isSubmitting}
          placeholder="Describe the topic for your IELTS reading test..."
          onSubmit={onSubmit}
        />
      </div>
      <SuggestionPrompts
        disabled={isSubmitting}
        suggestions={READING_SUGGESTIONS}
        onSelect={(suggestion) => {
          textInput.setInput(suggestion);
        }}
      />
      <div className="h-28" />
    </>
  );
}

export default function Component() {
  const createReading = useMutation(
    trpcOptions.reading.createReading.mutationOptions(),
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Reading</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeader>
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <PromptInputProvider>
          <ReadingContent
            isSubmitting={createReading.isPending}
            onSubmit={async (message) => {
              await createReading.mutateAsync({ prompt: message.text });
            }}
          />
        </PromptInputProvider>
      </main>
    </div>
  );
}
