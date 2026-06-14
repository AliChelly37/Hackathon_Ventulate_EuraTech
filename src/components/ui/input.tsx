import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full bg-[var(--paper-sunk)] px-3 py-2 text-base text-ink border-0 border-b-2 border-b-[var(--ink-faint)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--ink-faint)] focus:border-b-[var(--marker-teal)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
