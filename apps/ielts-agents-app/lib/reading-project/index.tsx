interface ReadingProjectProps {
  chatId: number;
}

export function ReadingProject({ chatId }: ReadingProjectProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Reading Test</h2>
        <p className="text-muted-foreground text-sm">
          Chat #{chatId} — Reading passage and questions will appear here as
          they are generated.
        </p>
      </div>
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Waiting for the agent to generate content...
      </div>
    </div>
  );
}
