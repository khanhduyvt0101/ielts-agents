import type { PropsWithChildren } from "react";

import { Spinner } from "~/components/ui/spinner";

export type SettingsTitleProps = PropsWithChildren<{
  loading?: boolean;
}>;

export function SettingsTitle({ loading, children }: SettingsTitleProps) {
  if (!loading) return children;
  return (
    <span className="flex items-center gap-1.5 md:gap-2">
      {children}
      <Spinner className="size-5 text-muted-foreground md:size-6" />
    </span>
  );
}
