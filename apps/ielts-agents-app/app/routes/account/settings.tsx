import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { AccountView } from "#./lib/account-view.tsx";

export default function Component() {
  return (
    <AccountView tab="settings">
      <AccountSettingsCards />
    </AccountView>
  );
}
