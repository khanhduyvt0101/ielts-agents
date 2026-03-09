import type { ReactNode } from "react";

import { useMemo } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";

interface VocabularyWord {
  word: string;
  definition: string;
  exampleUsage: string;
  ieltsRelevance: string;
}

interface ReadingPassageProps {
  passage: {
    title: string;
    content: string;
  };
  vocabulary?: VocabularyWord[];
}

function highlightVocabulary(
  text: string,
  vocabulary: VocabularyWord[],
): ReactNode[] {
  if (vocabulary.length === 0) return [text];

  const vocabMap = new Map<string, VocabularyWord>();
  for (const v of vocabulary) vocabMap.set(v.word.toLowerCase(), v);

  const pattern = vocabulary
    .map((v) => v.word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
    .join("|");
  const regex = new RegExp(String.raw`\b(${pattern})\b`, "gi");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

   
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex)
      parts.push(text.slice(lastIndex, match.index));

    const word = match[0];
    const vocab = vocabMap.get(word.toLowerCase());
    if (vocab) {
      parts.push(
        <VocabularyPopover key={match.index} vocab={vocab} word={word} />,
      );
    } else {
      parts.push(word);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function VocabularyPopover({
  word,
  vocab,
}: {
  word: string;
  vocab: VocabularyWord;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="cursor-pointer rounded-sm bg-amber-100/60 px-0.5 underline decoration-amber-400 decoration-dotted underline-offset-2 transition-colors hover:bg-amber-200/80 dark:bg-amber-900/30 dark:decoration-amber-600 dark:hover:bg-amber-900/50"
          type="button"
        >
          {word}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 text-xs">
        <p className="font-semibold">{vocab.word}</p>
        <p className="text-foreground/80">{vocab.definition}</p>
        <p className="text-muted-foreground italic">
          &ldquo;{vocab.exampleUsage}&rdquo;
        </p>
        <Badge
          className="h-auto shrink overflow-visible px-2.5 py-1 text-xs whitespace-normal"
          variant="outline"
        >
          {vocab.ieltsRelevance}
        </Badge>
      </PopoverContent>
    </Popover>
  );
}

export function ReadingPassage({
  passage,
  vocabulary = [],
}: ReadingPassageProps) {
  const paragraphs = useMemo(
    () => passage.content.split("\n").filter((p) => p.trim().length > 0),
    [passage.content],
  );
  const wordCount = passage.content.split(/\s+/).filter(Boolean).length;

  const highlightedParagraphs = useMemo(
    () =>
      vocabulary.length > 0
        ? paragraphs.map((p) => highlightVocabulary(p, vocabulary))
        : null,
    [paragraphs, vocabulary],
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 pb-8">
        <div>
          <h2 className="text-xl/tight font-bold">{passage.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {wordCount} words
          </p>
        </div>
        <Separator />
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm/relaxed text-foreground/90">
              {highlightedParagraphs ? highlightedParagraphs[index] : paragraph}
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
