import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { AccountView } from "#./lib/account-view.tsx";

export default function Component() {
	return (
		<AccountView tab="security">
			<SecuritySettingsCards />
		</AccountView>
	);
}
