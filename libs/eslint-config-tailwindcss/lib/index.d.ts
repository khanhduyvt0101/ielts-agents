import type { Linter } from "eslint";

declare function tailwindcss(options?: { css?: string }): Linter.Config[];

export default tailwindcss;
