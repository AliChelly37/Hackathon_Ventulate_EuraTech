import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full r-2 bg-[var(--paper-sunk)] px-3 py-2 text-base text-ink border-0 border-b-2 border-b-[var(--ink-faint)] placeholder:text-[var(--ink-faint)] focus:border-b-[var(--marker-teal)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
