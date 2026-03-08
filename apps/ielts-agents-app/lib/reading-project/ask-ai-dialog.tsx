import { MessageCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";

import { useSendMessage } from "#./lib/use-send-message.ts";

interface AskAIDialogProps {
  questionNumber: number;
  questionText: string;
}

export function AskAIDialog({
  questionNumber,
  questionText,
}: AskAIDialogProps) {
  const sendMessage = useSendMessage();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleSend = useCallback(() => {
    const text = prompt.trim()
      ? `About question ${questionNumber} ("${questionText}"): ${prompt.trim()}`
      : `Can you explain question ${questionNumber}? The question is: "${questionText}"`;
    void sendMessage({ text, files: [] });
    setOpen(false);
    setPrompt("");
  }, [prompt, questionNumber, questionText, sendMessage]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <MessageCircleIcon className="size-3.5" />
          Ask AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask AI about Question {questionNumber}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {questionText}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Ask anything about this question... (leave empty to get a general explanation)"
          rows={3}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <DialogFooter>
          <Button onClick={handleSend}>
            <MessageCircleIcon className="size-4" />
            Ask
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
