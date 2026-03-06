import { trpc } from "#./lib/trpc.ts";

import * as routes from "./routes/index.ts";

export const router = trpc.router(routes);
