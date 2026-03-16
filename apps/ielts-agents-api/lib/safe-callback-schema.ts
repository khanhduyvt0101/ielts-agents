import { appURL } from "ielts-agents-internal-util";
import { z } from "zod";

export const safeCallbackSchema = z
	.url()
	.refine((url) => url === appURL || url.startsWith(`${appURL}/`), {
		message: `callback URL must be or start with ${appURL}`,
	});
