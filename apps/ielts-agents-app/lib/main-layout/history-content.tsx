import { useMutation } from "@tanstack/react-query";
import {
  ForwardIcon,
  MessageSquareDashedIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "~/components/ui/sidebar";

import { RetryErrorAlert } from "#./lib/retry-error-alert.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";

import { HistoryDropdownMenuContent } from "./history-dropdown-menu-content.tsx";
import { useChatList } from "./use-chat-list.ts";

export function HistoryContent() {
  const { pathname } = useLocation();
  const { isError, error, isRefetching, isPending, data, refetch } =
    useChatList();
  const deleteChatMutation = useMutation(
    trpcOptions.chat.delete.mutationOptions(),
  );
  if (isPending) {
    return (
      <SidebarMenu>
        {Array.from({ length: 3 }, (value, key) => (
          <SidebarMenuItem key={key}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }
  if (isError) {
    return (
      <RetryErrorAlert
        error={error}
        isRefetching={isRefetching}
        refetch={refetch}
        title="Failed to load chats"
      />
    );
  }
  if (data.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <MessageSquareDashedIcon />
            <span>No chats yet</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  return (
    <SidebarMenu>
      {data.map((chat) => (
        <SidebarMenuItem key={chat.id}>
          <SidebarMenuButton asChild isActive={pathname === `/chat/${chat.id}`}>
            <Link to={`/chat/${chat.id}`}>
              <span>{chat.emoji}</span>
              <span>{chat.name}</span>
            </Link>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction showOnHover>
                <MoreHorizontalIcon />
                <span className="sr-only">View Actions</span>
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <HistoryDropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link to={`/chat/${chat.id}`}>
                  <ForwardIcon className="text-muted-foreground" />
                  <span>View Chat</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  deleteChatMutation.mutate({ id: chat.id });
                }}
              >
                <Trash2Icon className="text-muted-foreground" />
                <span>Delete Chat</span>
              </DropdownMenuItem>
            </HistoryDropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
