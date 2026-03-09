import { ChevronDownIcon, ChevronUpIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ScrollArea } from "~/components/ui/scroll-area";

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
}

export function ListeningScript({
  scripts,
  isSubmitted,
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
    <ScrollArea className="h-full">
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
                  <Badge variant="outline">
                    Section {script.sectionNumber}
                  </Badge>
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
                    {formatScript(script.script)}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function formatScript(script: string): React.ReactNode {
  // Highlight speaker labels
  const lines = script.split("\n");
  return lines.map((line, idx) => {
    const speakerMatch =
      /^(Speaker [A-Z]|Student [A-Z]|Professor|Narrator|Lecturer|Guide|Host|Tutor):/i.exec(
        line,
      );
    if (speakerMatch) {
      const label = speakerMatch[0];
      const rest = line.slice(label.length);
      return (
        <span key={idx}>
          <span className="font-semibold text-primary">{label}</span>
          {rest}
          {"\n"}
        </span>
      );
    }
    return (
      <span key={idx}>
        {line}
        {"\n"}
      </span>
    );
  });
}
