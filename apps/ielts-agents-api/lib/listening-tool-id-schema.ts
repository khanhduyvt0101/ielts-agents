import { z } from "zod";

import { listeningTools } from "#./lib/listening-tools.ts";

export const listeningToolIdSchema = z.enum(
	Object.keys(listeningTools) as [
		keyof typeof listeningTools,
		...(keyof typeof listeningTools)[],
	],
);
