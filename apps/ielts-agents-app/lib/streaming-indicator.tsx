import { Sparkles } from "lucide-react";

import { cn } from "~/lib/utils";

type StreamingVariant = "dots" | "pulse" | "sparkles";

interface StreamingIndicatorProps {
  variant?: StreamingVariant;
  message?: string;
  showLabel?: boolean;
  className?: string;
}

export function StreamingIndicator({
  variant = "sparkles",
  message = "Generating response",
  showLabel = true,
  className,
}: StreamingIndicatorProps) {
  const renderIndicator = () => {
    switch (variant) {
      case "dots": {
        return (
          <div className="flex items-center gap-1">
            <span className="size-2 animate-bounce rounded-full bg-current will-change-transform [animation-delay:-0.3s]" />
            <span className="size-2 animate-bounce rounded-full bg-current will-change-transform [animation-delay:-0.15s]" />
            <span className="size-2 animate-bounce rounded-full bg-current will-change-transform" />
          </div>
        );
      }

      case "pulse": {
        return (
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 animate-pulse rounded-full bg-current will-change-[opacity]" />
            <span className="size-2.5 animate-pulse rounded-full bg-current will-change-[opacity] [animation-delay:150ms]" />
            <span className="size-2.5 animate-pulse rounded-full bg-current will-change-[opacity] [animation-delay:300ms]" />
          </div>
        );
      }

      case "sparkles": {
        return (
          <Sparkles className="size-5 animate-pulse will-change-[opacity]" />
        );
      }

      default: {
        return null;
      }
    }
  };

  return (
    <div
      aria-label={message}
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        className,
      )}
      data-slot="ai-thinking-indicator"
      role="status"
    >
      {renderIndicator()}
      {showLabel && (
        <span aria-hidden="true" className="text-sm">
          {message}
          <span className="animate-pulse will-change-[opacity]">...</span>
        </span>
      )}
    </div>
  );
}

export type { StreamingIndicatorProps, StreamingVariant };
