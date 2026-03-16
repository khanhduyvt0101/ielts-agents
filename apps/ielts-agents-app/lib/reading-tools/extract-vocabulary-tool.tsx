import type { AgentMessage } from "ielts-agents-api/types";

import { BookAIcon } from "lucide-react";
import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

type MessagePart = AgentMessage["reading"]["parts"][number];

interface ExtractVocabularyToolProps {
	toolPart: Extract<MessagePart, { type: "tool-extract-vocabulary" }>;
}

export function ExtractVocabularyTool({
	toolPart,
}: ExtractVocabularyToolProps) {
	const isComplete = toolPart.state === "output-available";

	if (toolPart.state === "output-error") {
		return (
			<Task
				isComplete
				icon={
					<ToolIcon isComplete>
						<BookAIcon className="size-4" />
					</ToolIcon>
				}
				label="Extract vocabulary"
			>
				<ToolErrorContent
					description={toolPart.errorText}
					title="Failed to extract vocabulary"
					toolPart={toolPart}
				/>
			</Task>
		);
	}

	const words =
		toolPart.state === "input-available" || isComplete
			? toolPart.input.words
			: undefined;

	const count = words?.length ?? 0;
	const label = isComplete
		? `Extracted ${count} vocabulary ${count === 1 ? "word" : "words"}`
		: "Extracting vocabulary...";

	return (
		<Task
			icon={
				<ToolIcon isComplete={isComplete}>
					<BookAIcon className="size-4" />
				</ToolIcon>
			}
			isComplete={isComplete}
			label={label}
		>
			<ToolContainer>
				<div className="space-y-2 p-3">
					{words ? (
						<>
							<div className="flex flex-wrap gap-1.5">
								{words.slice(0, 8).map((w) => (
									<Badge key={w.word} variant="secondary">
										{w.word}
									</Badge>
								))}
								{words.length > 8 && (
									<Badge variant="outline">+{words.length - 8} more</Badge>
								)}
							</div>
							{isComplete && (
								<p className="text-xs text-muted-foreground">
									Vocabulary extracted — view in the Vocabulary tab
								</p>
							)}
						</>
					) : (
						<div className="space-y-2">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					)}
				</div>
			</ToolContainer>
		</Task>
	);
}
