import { atom } from "jotai";

import { createEventType } from "#./lib/create-event-type.ts";

class HydrationEvent extends CustomEvent<void> {
	static readonly type = createEventType();
	constructor() {
		super(HydrationEvent.type);
	}
}

const hydrationPromise = new Promise<void>((resolve) => {
	if (import.meta.env.SSR) return;
	addEventListener(
		HydrationEvent.type,
		(event) => {
			if (event instanceof HydrationEvent) resolve();
		},
		{ once: true },
	);
});

export const hydrationAtom = atom(hydrationPromise, () => {
	if (import.meta.env.SSR) return;
	dispatchEvent(new HydrationEvent());
});
