import type { Location } from "react-router";

import { atomWithPending } from "jotai-suspense";

export const locationAtom = atomWithPending<Location>();
