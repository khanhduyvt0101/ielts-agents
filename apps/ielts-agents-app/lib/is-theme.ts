import type { Theme } from "#./lib/theme.ts";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "auto";
}
