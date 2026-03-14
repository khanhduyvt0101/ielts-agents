import { ChevronDownIcon, ChevronUpIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

interface QuestionData {
  scriptQuote: string | null;
  questionNumber: number;
}

interface ScriptData {
  id: number;
  sectionNumber: number;
  sectionType: string;
  title: string;
  script: string;
}

interface ListeningScriptProps {
  scripts: ScriptData[];
  isSubmitted: boolean;
  questions?: QuestionData[];
}

export function ListeningScript({
  scripts,
  isSubmitted,
  questions,
}: ListeningScriptProps) {
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  if (!isSubmitted) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <FileTextIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Transcript Hidden</p>
          <p className="text-xs text-muted-foreground">
            Submit your test to view the full transcript
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {scripts.map((script) => {
        const isOpen = openSections[script.sectionNumber] ?? true;
        return (
          <Collapsible
            key={script.sectionNumber}
            open={isOpen}
            onOpenChange={(open) => {
              setOpenSections((prev) => ({
                ...prev,
                [script.sectionNumber]: open,
              }));
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                type="button"
              >
                <Badge variant="outline">Section {script.sectionNumber}</Badge>
                <span className="flex-1 text-sm font-medium">
                  {script.title}
                </span>
                <Badge className="capitalize" variant="secondary">
                  {script.sectionType}
                </Badge>
                {isOpen ? (
                  <ChevronUpIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border bg-card p-4">
                <div className="text-sm/relaxed whitespace-pre-wrap">
                  {formatScriptWithHighlights(script.script, questions)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function formatScriptWithHighlights(
  script: string,
  questions?: QuestionData[],
): React.ReactNode {
  const quotes =
    questions
      ?.filter(
        (q): q is QuestionData & { scriptQuote: string } =>
          q.scriptQuote !== null,
      )
      .map((q) => ({
        quote: q.scriptQuote,
        questionNumber: q.questionNumber,
      })) ?? [];

  const lines = script.split("\n");
  return lines.map((line, idx) => {
    const speakerMatch =
      /^(Speaker [A-Z]|Student [A-Z]|Professor|Narrator|Lecturer|Guide|Host|Tutor):/i.exec(
        line,
      );

    const content: React.ReactNode = speakerMatch ? (
      <>
        <span className="font-semibold text-primary">{speakerMatch[0]}</span>
        {highlightQuotes(line.slice(speakerMatch[0].length), quotes)}
      </>
    ) : (
      highlightQuotes(line, quotes)
    );

    return (
      <span key={idx}>
        {content}
        {"\n"}
      </span>
    );
  });
}

function highlightQuotes(
  text: string,
  quotes: { quote: string; questionNumber: number }[],
): React.ReactNode {
  if (quotes.length === 0) return text;

  const lowerText = text.toLowerCase();
  const highlights: { start: number; end: number; questionNumber: number }[] =
    [];

  for (const { quote, questionNumber } of quotes) {
    const lowerQuote = quote.toLowerCase();
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const pos = lowerText.indexOf(lowerQuote, searchFrom);
      if (pos === -1) break;
      highlights.push({
        start: pos,
        end: pos + quote.length,
        questionNumber,
      });
      searchFrom = pos + quote.length;
    }
  }

  if (highlights.length === 0) return text;

  highlights.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  for (const hl of highlights) {
    if (hl.start < lastEnd) continue;
    if (hl.start > lastEnd) parts.push(text.slice(lastEnd, hl.start));
    parts.push(
      <mark
        key={`${hl.start}-${hl.questionNumber}`}
        className="rounded-sm bg-amber-200/60 px-0.5 dark:bg-amber-800/40"
        title={`Answer for Q${hl.questionNumber}`}
      >
        {text.slice(hl.start, hl.end)}
      </mark>,
    );
    lastEnd = hl.end;
  }
  if (lastEnd < text.length) parts.push(text.slice(lastEnd));

  return parts;
}
