import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center r-pill px-3 py-0.5 text-sm font-hand font-semibold -rotate-[0.5deg] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--marker-teal)] text-white ink-border-thin",
        secondary: "bg-[var(--paper-sunk)] text-ink ink-border-thin",
        destructive: "bg-[var(--marker-red)] text-white ink-border-thin",
        outline: "bg-transparent text-ink border-[1.5px] border-[var(--ink)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
