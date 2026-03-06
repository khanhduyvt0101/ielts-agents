import type { NavigateOptions, To } from "react-router";

import { atomWithPending } from "jotai-suspense";

export interface Navigator {
  navigate: (to: To, options?: NavigateOptions) => void | Promise<void>;
}

export const navigatorAtom = atomWithPending<Navigator>();
