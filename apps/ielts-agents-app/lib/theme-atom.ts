import { atomWithStorage } from "jotai/utils";
import { isTheme } from "#./lib/is-theme.ts";
import type { Theme } from "#./lib/theme.ts";

export const themeAtom = atomWithStorage<Theme>(
	"ielts-agents-theme",
	"auto",
	{
		getItem: (key, initialValue) => {
			if (import.meta.env.SSR) return initialValue;
			const value = localStorage.getItem(key);
			return isTheme(value) ? value : initialValue;
		},
		setItem: (key, newValue) => {
			localStorage.setItem(key, newValue);
		},
		removeItem: (key) => {
			localStorage.removeItem(key);
		},
		subscribe: (key, callback, initialValue) => {
			const handler = (event: StorageEvent) => {
				if (event.storageArea === localStorage && event.key === key)
					callback(isTheme(event.newValue) ? event.newValue : initialValue);
			};
			addEventListener("storage", handler);
			return () => {
				removeEventListener("storage", handler);
			};
		},
	},
	{
		getOnInit: true,
	},
);
