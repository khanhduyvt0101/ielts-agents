import { z } from "zod";

import { writingTools } from "#./lib/writing-tools.ts";

export const writingToolIdSchema = z.enum(
	Object.keys(writingTools) as [
		keyof typeof writingTools,
		...(keyof typeof writingTools)[],
	],
);
