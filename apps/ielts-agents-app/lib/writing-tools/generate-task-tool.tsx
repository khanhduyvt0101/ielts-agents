import type { AgentMessage } from "ielts-agents-api/types";

import { PenLineIcon } from "lucide-react";
import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

type MessagePart = AgentMessage["writing"]["parts"][number];

interface GenerateTaskToolProps {
	toolPart: Extract<MessagePart, { type: "tool-generate-task" }>;
}

export function GenerateTaskTool({ toolPart }: GenerateTaskToolProps) {
	const isComplete = toolPart.state === "output-available";

	if (toolPart.state === "output-error") {
		return (
			<Task
				isComplete
				icon={
					<ToolIcon isComplete>
						<PenLineIcon className="size-4" />
					</ToolIcon>
				}
				label="Generate writing task"
			>
				<ToolErrorContent
					description={toolPart.errorText}
					title="Failed to generate task"
					toolPart={toolPart}
				/>
			</Task>
		);
	}

	const taskType =
		toolPart.state === "input-available" || isComplete
			? toolPart.input.taskType
			: undefined;

	const prompt =
		toolPart.state === "input-available" || isComplete
			? toolPart.input.prompt
			: undefined;

	const label = prompt
		? `Generated task: ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`
		: "Generating writing task...";

	return (
		<Task
			icon={
				<ToolIcon isComplete={isComplete}>
					<PenLineIcon className="size-4" />
				</ToolIcon>
			}
			isComplete={isComplete}
			label={label}
		>
			<ToolContainer>
				<div className="space-y-2 p-3">
					{taskType ? (
						<div className="flex items-center justify-between gap-2">
							<Badge variant="secondary">
								{taskType === "task-1" ? "Task 1" : "Task 2"}
							</Badge>
							{prompt && (
								<p className="flex-1 truncate text-sm text-muted-foreground">
									{prompt.slice(0, 100)}
								</p>
							)}
						</div>
					) : (
						<div className="space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					)}
					{isComplete && (
						<p className="text-xs text-muted-foreground">
							Task generated — view it in the Task tab
						</p>
					)}
				</div>
			</ToolContainer>
		</Task>
	);
}
