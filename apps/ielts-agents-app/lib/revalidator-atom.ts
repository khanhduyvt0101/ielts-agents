import { atomWithPending } from "jotai-suspense";
import type { useRevalidator } from "react-router";

export type Revalidator = ReturnType<typeof useRevalidator>;

export const revalidatorAtom = atomWithPending<Revalidator>();
