import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "~/components/ui/sidebar";

import { HistoryContent } from "./history-content.tsx";
import { HistorySidebarGroupAction } from "./history-sidebar-group-action.tsx";

export function MainHistory() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>History</SidebarGroupLabel>
      <HistorySidebarGroupAction />
      <SidebarGroupContent>
        <HistoryContent />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
