import { BookAIcon, MessageCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useSendMessage } from "#./lib/use-send-message.ts";
import { Badge } from "~/components/ui/badge";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";

interface VocabularyWord {
	id: number;
	word: string;
	definition: string;
	exampleUsage: string;
	ieltsRelevance: string;
}

interface ReadingVocabularyProps {
	vocabulary: VocabularyWord[];
	disabled?: boolean;
}

export function ReadingVocabulary({
	vocabulary,
	disabled,
}: ReadingVocabularyProps) {
	if (vocabulary.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
				<BookAIcon className="size-8 text-muted-foreground/50" />
				<p className="text-sm text-muted-foreground">
					No vocabulary words yet. They will appear here after a passage is
					generated.
				</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-full">
			<div className="space-y-4 p-4 pb-8">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold">
						Key Vocabulary ({vocabulary.length})
					</h3>
				</div>
				<Separator />
				{vocabulary.map((word) => (
					<div
						key={word.id}
						className="min-w-0 space-y-2 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-muted/50"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<h4 className="truncate text-sm font-semibold">{word.word}</h4>
							</div>
							<div className="flex shrink-0 gap-1">
								<AskVocabDialog disabled={disabled} word={word.word} />
							</div>
						</div>
						<p className="text-xs wrap-break-word text-foreground/80">
							{word.definition}
						</p>
						<p className="text-xs wrap-break-word text-muted-foreground italic">
							&ldquo;{word.exampleUsage}&rdquo;
						</p>
						<Badge
							className="h-auto shrink overflow-visible px-2.5 py-1 text-xs whitespace-normal"
							variant="outline"
						>
							{word.ieltsRelevance}
						</Badge>
					</div>
				))}
			</div>
		</ScrollArea>
	);
}

function AskVocabDialog({
	word,
	disabled,
}: {
	word: string;
	disabled?: boolean;
}) {
	const sendMessage = useSendMessage();
	const [open, setOpen] = useState(false);
	const [prompt, setPrompt] = useState("");

	const defaultPrompt = `Can you explain the word "${word}" in more detail? How is it commonly used in IELTS reading passages?`;

	const handleSend = useCallback(() => {
		const text = prompt.trim() || defaultPrompt;
		void sendMessage({ text, files: [] });
		setOpen(false);
		setPrompt("");
	}, [prompt, defaultPrompt, sendMessage]);

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (isOpen) setPrompt(defaultPrompt);
			}}
		>
			<DialogTrigger asChild>
				<Button disabled={disabled} size="sm" variant="ghost">
					<MessageCircleIcon className="size-3.5" />
					Ask
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Ask about &ldquo;{word}&rdquo;</DialogTitle>
					<DialogDescription>
						Customize your question or send the default prompt.
					</DialogDescription>
				</DialogHeader>
				<Textarea
					placeholder="Ask anything about this word..."
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

export type { VocabularyWord };
