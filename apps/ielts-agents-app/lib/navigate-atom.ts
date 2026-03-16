import { shallowEqual } from "@mantine/hooks";
import type {
	NavigateOptions,
	Location as RouterLocation,
	To,
} from "react-router";

import { atomWithWriteOnly } from "#./lib/atom-with-write-only.ts";
import { locationAtom } from "#./lib/location-atom.ts";
import { navigationCountAtom } from "#./lib/navigation-count-atom.ts";
import { navigatorAtom } from "#./lib/navigator-atom.ts";

interface WaitOptions {
	interval?: number;
	timeout?: number;
}

interface Options extends NavigateOptions {
	navigationCount?: number;
	wait?: boolean | number | WaitOptions;
}

export const navigateAtom = atomWithWriteOnly(
	async (get, _set, to: To, options: Options = {}) => {
		const { navigationCount, wait, ...navigateOptions } = options;
		if (
			typeof navigationCount === "number" &&
			navigationCount !== get(navigationCountAtom)
		)
			return;
		const navigator = get(navigatorAtom);
		await navigator.navigate(to, navigateOptions);
		if (!wait) return;
		await new Promise<void>((resolve) => {
			const DEFAULT_INTERVAL = 50;
			const DEFAULT_TIMEOUT = 10_000;
			let pollingInterval: number;
			let maxTimeout: number;
			if (typeof wait === "number") {
				pollingInterval = wait;
				maxTimeout = DEFAULT_TIMEOUT;
			} else if (typeof wait === "object") {
				pollingInterval = wait.interval ?? DEFAULT_INTERVAL;
				maxTimeout = wait.timeout ?? DEFAULT_TIMEOUT;
			} else {
				pollingInterval = DEFAULT_INTERVAL;
				maxTimeout = DEFAULT_TIMEOUT;
			}
			const cleanup = () => {
				clearInterval(interval);
				clearTimeout(timeoutId);
			};
			const interval = setInterval(() => {
				const location = get(locationAtom);
				if (
					(typeof to === "string" && to === location.pathname) ||
					(typeof to === "object" &&
						shallowEqual(
							to,
							Object.fromEntries(
								Object.keys(to).map((key) => [
									key,
									location[key as keyof RouterLocation],
								]),
							),
						))
				) {
					cleanup();
					resolve();
				}
			}, pollingInterval);

			const timeoutId = setTimeout(() => {
				cleanup();
				resolve();
			}, maxTimeout);
		});
	},
);
