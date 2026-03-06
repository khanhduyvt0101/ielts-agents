import { AccountView } from "#./lib/account-view.tsx";
import { AppearanceCard } from "#./lib/appearance-card.tsx";

export default function Component() {
  return (
    <AccountView tab="display">
      <AppearanceCard />
    </AccountView>
  );
}
