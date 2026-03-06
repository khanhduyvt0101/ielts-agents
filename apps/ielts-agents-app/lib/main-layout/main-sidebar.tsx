import { useSetAtom } from "jotai";
import { BookOpenIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";

import { AgentSelector } from "#./lib/agent-selector.tsx";
import { sidebarOpenAtom } from "#./lib/sidebar-open-atom.ts";
import { version } from "#./package.json" with { type: "json" };

import { MainHistory } from "./main-history.tsx";
import { MainUser } from "./main-user.tsx";
import { RemainingCredits } from "./remaining-credits.tsx";

export function MainSidebar() {
  const navigate = useNavigate();
  const setOpenSidebar = useSetAtom(sidebarOpenAtom);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              onClick={() => {
                void navigate("/");
                setOpenSidebar(true);
              }}
            >
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpenIcon className="size-5! fill-current" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">ChatAcademia</span>
                  <span className="opacity-70">v{version}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AgentSelector />
        <MainHistory />
      </SidebarContent>
      <SidebarFooter>
        <RemainingCredits />
        <MainUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
