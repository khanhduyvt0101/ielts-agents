import type { LucideProps } from "lucide-react";

import { Loader2Icon } from "lucide-react";
import { forwardRef } from "react";

export const SpinnerIcon = forwardRef<SVGSVGElement, LucideProps>(
  (props, ref) => (
    <Loader2Icon ref={ref} {...props} className="size-4 animate-spin" />
  ),
);
