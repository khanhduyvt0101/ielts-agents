import type { Linter } from "eslint";

declare function react(options?: {
  preset?: "Node.js" | "Next.js" | "React Router";
}): Linter.Config[];

export default react;
