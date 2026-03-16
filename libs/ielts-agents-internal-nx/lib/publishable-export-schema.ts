import { z } from "zod";

export const publishableExportSchema = z.union([
	z.string(),
	z.object({ types: z.string().optional(), import: z.string() }).strict(),
]);
