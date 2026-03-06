import type { PropsWithChildren } from "react";

import { useDebouncedCallback } from "@mantine/hooks";
import { useNavigate } from "react-router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type Tab = "settings" | "security" | "billing" | "display";

const tabs: { value: Tab; label: string; href: string }[] = [
  { value: "settings", label: "Settings", href: "/account/settings" },
  { value: "security", label: "Security", href: "/account/security" },
  { value: "billing", label: "Billing", href: "/account/billing" },
  { value: "display", label: "Display", href: "/account/display" },
];

export interface AccountViewProps extends PropsWithChildren {
  tab: Tab;
}

export function AccountView({ tab, children }: AccountViewProps) {
  const navigate = useNavigate();
  const debouncedNavigate = useDebouncedCallback((href: string) => {
    void navigate(href);
  }, 100);

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent align="start">Toggle Sidebar</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Mobile: Select dropdown */}
        <div className="mb-6 sm:hidden">
          <Select
            value={tab}
            onValueChange={(value) => {
              const selectedTab = tabs.find((t) => t.value === value);
              if (selectedTab) debouncedNavigate(selectedTab.href);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <Tabs
          className="hidden sm:block"
          value={tab}
          onValueChange={(value) => {
            const selectedTab = tabs.find((t) => t.value === value);
            if (selectedTab) debouncedNavigate(selectedTab.href);
          }}
        >
          <TabsList className="mb-6 w-full justify-start">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {children}
      </div>
    </>
  );
}
