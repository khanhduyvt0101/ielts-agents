import type { Write } from "jotai";

import { atom } from "jotai";

export function atomWithWriteOnly<Args extends unknown[], Result>(
  write: Write<(...args: Args) => Result, Args, Result>,
) {
  return atom((get, { setSelf }) => setSelf, write);
}
