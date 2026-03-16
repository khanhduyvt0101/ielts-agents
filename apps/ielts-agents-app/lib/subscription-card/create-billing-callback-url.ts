import { appURL } from "ielts-agents-internal-util";

export function createBillingCallbackURL(event = "managed-billing") {
	const url = new URL(`${appURL}/continue`);
	url.searchParams.set("event", event);
	url.searchParams.set("callback", `${appURL}/account/billing`);
	return url.toString();
}
