import { z } from "zod";

export const positiveIntSchema = z.number().int().positive();

export const nonEmptyStringSchema = z.string().trim().nonempty();
