import { useQuery } from "@tanstack/react-query";
import type { AgentId } from "ielts-agents-api/types";
import { useAtom } from "jotai";
import {
	PanelRightCloseIcon,
	PanelRightOpenIcon,
	RefreshCcwIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { projectOpenAtom } from "#./lib/project-open-atom.ts";
import { SpinnerIcon } from "#./lib/spinner-icon.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

function getAgentRoute(agent: AgentId): string {
	switch (agent) {
		case "listening": {
			return "/listening";
		}
		default: {
			return "/reading";
		}
	}
}

function getAgentLabel(agent: AgentId): string {
	switch (agent) {
		case "listening": {
			return "Listening";
		}
		default: {
			return "Reading";
		}
	}
}

function BreadcrumbInChatPage({ agent, chatId }: AgentChatHeaderProps) {
	const { data, isError, error, isRefetching, refetch, isPending } = useQuery(
		trpcOptions.chat.getChatConfig.queryOptions({ id: chatId }),
	);
	return (
		<Breadcrumb className="min-w-0 flex-1">
			<BreadcrumbList className="flex-nowrap">
				<BreadcrumbItem className="hidden sm:block">
					<BreadcrumbLink asChild>
						<Link
							className="flex items-center gap-1.5"
							to={getAgentRoute(agent)}
						>
							{getAgentLabel(agent)}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator className="hidden sm:block" />
				{isPending ? (
					<BreadcrumbItem className="min-w-0">
						<BreadcrumbPage>
							<Skeleton className="h-4 w-30" />
						</BreadcrumbPage>
					</BreadcrumbItem>
				) : isError ? (
					<BreadcrumbItem className="min-w-0 flex-1">
						<BreadcrumbPage className="max-w-40 truncate text-destructive sm:max-w-60">
							Failed to load chat name: {error.message}
						</BreadcrumbPage>
						<Button
							disabled={isRefetching}
							size="icon"
							variant="ghost"
							onClick={() => void refetch()}
						>
							{isRefetching ? <SpinnerIcon /> : <RefreshCcwIcon />}
						</Button>
					</BreadcrumbItem>
				) : (
					<BreadcrumbItem className="min-w-0 flex-1">
						<BreadcrumbPage className="truncate">
							{data.name ? (
								`${data.emoji} ${data.name}`
							) : (
								<Skeleton className="h-4 w-30" />
							)}
						</BreadcrumbPage>
					</BreadcrumbItem>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

interface AgentChatHeaderProps {
	agent: AgentId;
	chatId: number;
}

export function AgentChatHeader({ agent, chatId }: AgentChatHeaderProps) {
	const [projectOpen, setProjectOpen] = useAtom(projectOpenAtom);
	const location = useLocation();
	const isChatPage = location.pathname.startsWith("/chat");
	return (
		<div className="flex shrink-0 items-center justify-between gap-2 px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:gap-3 sm:px-3">
			<div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger className="shrink-0" />
					</TooltipTrigger>
					<TooltipContent align="start">Toggle Sidebar</TooltipContent>
				</Tooltip>
				{isChatPage ? (
					<BreadcrumbInChatPage agent={agent} chatId={chatId} />
				) : (
					<Breadcrumb className="min-w-0">
						<BreadcrumbList>
							<BreadcrumbItem className="min-w-0">
								<BreadcrumbPage className="flex items-center gap-1.5 truncate">
									{getAgentLabel(agent)}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				)}
			</div>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="size-7"
						size="icon"
						variant="ghost"
						onClick={() => {
							setProjectOpen((prev) => !prev);
						}}
					>
						{projectOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
						<span className="sr-only">Toggle Project Panel</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent align="end">Toggle Project</TooltipContent>
			</Tooltip>
		</div>
	);
}
