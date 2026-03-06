import { normalizeCallback } from "#./lib/normalize-callback.ts";
import { retrieveCallback } from "#./lib/retrieve-callback.ts";

export function produceCallback(url: string) {
  const callback = normalizeCallback(retrieveCallback() || url);
  if (!callback || callback === "/") {
    sessionStorage.removeItem("ielts-agents-callback");
    localStorage.removeItem("ielts-agents-callback");
  } else {
    sessionStorage.setItem("ielts-agents-callback", callback);
    localStorage.setItem("ielts-agents-callback", callback);
  }
}
