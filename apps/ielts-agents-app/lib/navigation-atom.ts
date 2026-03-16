import { atomWithPending } from "jotai-suspense";
import type { Navigation } from "react-router";

export const navigationAtom = atomWithPending<Navigation>();
