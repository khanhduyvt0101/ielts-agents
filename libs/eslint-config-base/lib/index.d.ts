import type { Linter } from "eslint";

declare function base(options?: {
  preset?: "Node.js" | "Next.js" | "React Router";
}): Linter.Config[];

export default base;
