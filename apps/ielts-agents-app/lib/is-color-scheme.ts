import type { ColorScheme } from "#./lib/color-scheme.ts";

export function isColorScheme(value: unknown): value is ColorScheme {
  return value === "light" || value === "dark";
}
