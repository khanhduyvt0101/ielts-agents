import type { Navigation } from "react-router";

import { atomWithPending } from "jotai-suspense";

export const navigationAtom = atomWithPending<Navigation>();
