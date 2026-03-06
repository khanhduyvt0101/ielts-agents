import { planKeys } from "ielts-agents-internal-util";
import { z } from "zod";

export const planKeySchema = z.enum(planKeys);
