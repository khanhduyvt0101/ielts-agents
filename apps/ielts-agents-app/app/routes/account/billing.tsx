import { AccountView } from "#./lib/account-view.tsx";
import { SubscriptionCard } from "#./lib/subscription-card/index.tsx";

export default function Component() {
  return (
    <AccountView tab="billing">
      <SubscriptionCard />
    </AccountView>
  );
}
