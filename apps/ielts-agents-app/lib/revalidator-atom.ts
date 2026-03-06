import type { useRevalidator } from "react-router";

import { atomWithPending } from "jotai-suspense";

export type Revalidator = ReturnType<typeof useRevalidator>;

export const revalidatorAtom = atomWithPending<Revalidator>();
