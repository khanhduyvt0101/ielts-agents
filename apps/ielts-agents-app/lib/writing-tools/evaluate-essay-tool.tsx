import type { AgentMessage } from "ielts-agents-api/types";

import { ClipboardCheckIcon } from "lucide-react";
import { Task } from "#./lib/task.tsx";
import { ToolContainer } from "#./lib/tool-container.tsx";
import { ToolErrorContent } from "#./lib/tool-error-content.tsx";
import { ToolIcon } from "#./lib/tool-icon.tsx";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

type MessagePart = AgentMessage["writing"]["parts"][number];

interface EvaluateEssayToolProps {
	toolPart: Extract<MessagePart, { type: "tool-evaluate-essay" }>;
}

export function EvaluateEssayTool({ toolPart }: EvaluateEssayToolProps) {
	const isComplete = toolPart.state === "output-available";

	if (toolPart.state === "output-error") {
		return (
			<Task
				isComplete
				icon={
					<ToolIcon isComplete>
						<ClipboardCheckIcon className="size-4" />
					</ToolIcon>
				}
				label="Evaluate essay"
			>
				<ToolErrorContent
					description={toolPart.errorText}
					title="Failed to evaluate essay"
					toolPart={toolPart}
				/>
			</Task>
		);
	}

	const overallBand =
		toolPart.state === "input-available" || isComplete
			? toolPart.input.overallBand
			: undefined;

	const label = overallBand
		? `Essay evaluated: Band ${overallBand}`
		: "Evaluating your essay...";

	return (
		<Task
			icon={
				<ToolIcon isComplete={isComplete}>
					<ClipboardCheckIcon className="size-4" />
				</ToolIcon>
			}
			isComplete={isComplete}
			label={label}
		>
			<ToolContainer>
				<div className="space-y-2 p-3">
					{overallBand ? (
						<>
							<div className="flex items-center gap-2">
								<Badge className="text-base">Band {overallBand}</Badge>
							</div>
							{(toolPart.state === "input-available" || isComplete) && (
								<div className="flex flex-wrap gap-1.5">
									<Badge className="text-xs" variant="outline">
										TA: {toolPart.input.taskAchievement}
									</Badge>
									<Badge className="text-xs" variant="outline">
										CC: {toolPart.input.coherenceCohesion}
									</Badge>
									<Badge className="text-xs" variant="outline">
										LR: {toolPart.input.lexicalResource}
									</Badge>
									<Badge className="text-xs" variant="outline">
										GRA: {toolPart.input.grammaticalRange}
									</Badge>
								</div>
							)}
						</>
					) : (
						<div className="space-y-2">
							<Skeleton className="h-6 w-24" />
							<Skeleton className="h-3 w-3/4" />
						</div>
					)}
					{isComplete && (
						<p className="text-xs text-muted-foreground">
							View detailed feedback in the Evaluation tab
						</p>
					)}
				</div>
			</ToolContainer>
		</Task>
	);
}
