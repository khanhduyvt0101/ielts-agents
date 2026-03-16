import { createAuthClient } from "better-auth/react";
import { apiURL } from "ielts-agents-internal-util";

export const authClient = createAuthClient({
	baseURL: apiURL,
	basePath: "/v1/auth",
});
