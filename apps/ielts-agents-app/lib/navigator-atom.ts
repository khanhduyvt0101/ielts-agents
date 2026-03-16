import { atomWithPending } from "jotai-suspense";
import type { NavigateOptions, To } from "react-router";

export interface Navigator {
	navigate: (to: To, options?: NavigateOptions) => void | Promise<void>;
}

export const navigatorAtom = atomWithPending<Navigator>();
