import { isLive } from "#./lib/is-live.ts";

export const apiURL = isLive
	? "https://api.ielts-agents.com"
	: "http://localhost:42310";

export const appURL = isLive
	? "https://app.ielts-agents.com"
	: "http://localhost:42312";

export const trustedOrigins = [apiURL, appURL];
