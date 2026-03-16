import type { LucideIcon } from "lucide-react";
import { MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import type { Theme } from "#./lib/theme.ts";

interface Option {
	value: Theme;
	label: string;
	icon: LucideIcon;
}

export const appearanceOptions: Option[] = [
	{ value: "auto", label: "Auto", icon: SunMoonIcon },
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
];
