import { z } from "zod";

export const chatIdSchema = z.coerce.number().int().positive();
