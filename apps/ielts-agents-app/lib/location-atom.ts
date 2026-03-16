import { atomWithPending } from "jotai-suspense";
import type { Location } from "react-router";

export const locationAtom = atomWithPending<Location>();
