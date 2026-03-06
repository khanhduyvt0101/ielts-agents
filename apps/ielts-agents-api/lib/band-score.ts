import type { z } from "zod";

import type { bandScoreSchema } from "#./lib/band-score-schema.ts";

export type BandScore = z.infer<typeof bandScoreSchema>;
