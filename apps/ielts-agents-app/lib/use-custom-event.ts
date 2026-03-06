import type { DependencyList } from "react";

import { useEffect } from "react";

export function useCustomEvent<T extends CustomEvent>(
  callback: (event: T) => void,
  deps: DependencyList,
  CustomEvent: { new (...args: any[]): T; readonly type: string }, // eslint-disable-line @typescript-eslint/no-explicit-any
): void {
  useEffect(() => {
    const listener = (event: Event): void => {
      if (event instanceof CustomEvent) callback(event);
    };
    addEventListener(CustomEvent.type, listener);
    return () => {
      removeEventListener(CustomEvent.type, listener);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
