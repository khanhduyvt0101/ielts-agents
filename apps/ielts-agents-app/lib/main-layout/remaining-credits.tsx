import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "ielts-agents-internal-util";
import { CirclePlusIcon, CoinsIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { SpinnerIcon } from "#./lib/spinner-icon.tsx";
import { trpcOptions } from "#./lib/trpc-options.ts";

function RemainingCreditsLabel() {
  const { data, isPending, isError } = useQuery(
    trpcOptions.workspace.sync.queryOptions(),
  );
  if (isPending) return <SpinnerIcon />;
  if (isError)
    return <p className="text-destructive">Failed to load remaining credits</p>;
  const { aggregatedCredits, usedCredits, planValidity } = data;
  if (!planValidity) {
    return (
      <span className="text-muted-foreground">Your subscription is paused</span>
    );
  }
  const displayRemaining = Math.max(0, aggregatedCredits - usedCredits);
  return `${formatNumber(displayRemaining)} monthly credits left`;
}

function UpgradePopoverContent() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        <RemainingCreditsLabel />
      </p>
      <Button asChild size="sm">
        <Link to="/account/billing">Upgrade</Link>
      </Button>
    </div>
  );
}

export function RemainingCredits() {
  const { state } = useSidebar();
  const navigate = useNavigate();

  switch (state) {
    case "expanded": {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="pointer-events-none">
              <CoinsIcon className="text-orange-300" />
              <RemainingCreditsLabel />
            </SidebarMenuButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="pointer-events-auto absolute top-0.5 right-1 size-7 group-data-[collapsible=icon]:hidden"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    void navigate("/account/billing");
                  }}
                >
                  <CirclePlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upgrade</p>
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
    case "collapsed": {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton>
                  <CoinsIcon className="text-orange-300" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto" side="right">
                <UpgradePopoverContent />
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
  }
}
