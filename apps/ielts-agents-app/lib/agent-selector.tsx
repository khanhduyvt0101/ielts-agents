import { BookOpenIcon, MessageCircleIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

function getAgentIcon(to: string) {
  switch (to) {
    case "/reading": {
      return BookOpenIcon;
    }
    default: {
      return MessageCircleIcon;
    }
  }
}

const agents: {
  to: string;
  name: string;
  beta?: boolean;
}[] = [
  {
    to: "/reading",
    name: "Reading",
  },
];

export function AgentSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Agents</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {agents.map((agent) => {
            const Icon = getAgentIcon(agent.to);
            const isActive = location.pathname === agent.to;
            return (
              <SidebarMenuItem key={agent.to}>
                <SidebarMenuButton
                  className="h-auto cursor-pointer py-2"
                  isActive={isActive}
                  onClick={() => {
                    void navigate(agent.to);
                  }}
                >
                  <Icon className="size-4 shrink-0" />
                  <div className="flex flex-1 items-center overflow-hidden">
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
