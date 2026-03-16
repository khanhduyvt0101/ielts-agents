import { normalizeCallback } from "#./lib/normalize-callback.ts";
import { retrieveCallback } from "#./lib/retrieve-callback.ts";

export function consumeCallback(): string {
	const callback = normalizeCallback(retrieveCallback());
	sessionStorage.removeItem("ielts-agents-callback");
	localStorage.removeItem("ielts-agents-callback");
	return callback;
}
