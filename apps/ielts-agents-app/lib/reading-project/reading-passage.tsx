import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";

interface ReadingPassageProps {
  passage: {
    title: string;
    content: string;
  };
}

export function ReadingPassage({ passage }: ReadingPassageProps) {
  const paragraphs = passage.content
    .split("\n")
    .filter((p) => p.trim().length > 0);
  const wordCount = passage.content.split(/\s+/).filter(Boolean).length;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 pb-8">
        <div>
          <h2 className="text-xl/tight font-bold">
            {passage.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {wordCount} words
          </p>
        </div>
        <Separator />
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-sm/relaxed text-foreground/90"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

