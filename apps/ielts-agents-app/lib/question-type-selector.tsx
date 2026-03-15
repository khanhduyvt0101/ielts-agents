import { ListFilterIcon } from "lucide-react";
import { useCallback } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

interface QuestionType {
  id: string;
  label: string;
}

interface QuestionTypeSelectorProps {
  types: QuestionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function QuestionTypeSelector({
  types,
  selected,
  onChange,
  disabled,
  loading,
}: QuestionTypeSelectorProps) {
  const allSelected = selected.length === types.length;

  const toggleAll = useCallback(() => {
    onChange(allSelected ? [types[0].id] : types.map((t) => t.id));
  }, [allSelected, onChange, types]);

  const toggleType = useCallback(
    (id: string) => {
      if (selected.includes(id)) {
        // Prevent deselecting the last type — minimum 1 required
        if (selected.length <= 1) return;
        onChange(selected.filter((s) => s !== id));
      } else {
        onChange([...selected, id]);
      }
    },
    [selected, onChange],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-1.5 border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
            "hover:bg-accent hover:text-foreground",
          )}
          disabled={disabled}
          size="sm"
          type="button"
          variant="ghost"
        >
          {loading ? (
            <>
              <Spinner />
              <span className="text-xs">Types</span>
            </>
          ) : (
            <>
              <ListFilterIcon className="size-3.5" />
              <span className="text-xs">
                {allSelected ? "All Types" : "Question Types"}
              </span>
              {!allSelected && selected.length > 0 && (
                <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                  {selected.length}/{types.length}
                </Badge>
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <Command>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium">Question Types</span>
            <button
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              type="button"
              onClick={toggleAll}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <CommandList>
            <CommandSeparator className="hidden" />
            <CommandGroup>
              {types.map((type) => {
                const isSelected = selected.includes(type.id);
                return (
                  <CommandItem
                    key={type.id}
                    className="cursor-pointer text-xs"
                    data-checked={isSelected}
                    onSelect={() => {
                      toggleType(type.id);
                    }}
                  >
                    {type.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
