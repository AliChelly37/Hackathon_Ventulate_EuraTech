import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "relative inline-flex items-center justify-center gap-2 font-hand font-semibold whitespace-nowrap select-none cursor-pointer transition-[transform,box-shadow,background-color] duration-150 ease-out disabled:cursor-not-allowed disabled:!shadow-none disabled:!transform-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--marker-teal)] text-white ink-border sketch-shadow hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none",
        secondary:
          "bg-[var(--paper-2)] text-ink ink-border sketch-shadow hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none",
        ghost:
          "bg-transparent text-ink ink-border hover:bg-[var(--paper-2)] active:translate-x-0.5 active:translate-y-0.5",
        danger:
          "bg-[var(--marker-red)] text-white ink-border sketch-shadow hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none",
      },
      size: {
        sm: "text-base px-4 py-1.5 r-pill -rotate-[0.5deg]",
        md: "text-lg px-5 py-2 r-pill -rotate-[0.5deg]",
        lg: "text-xl px-7 py-3 r-pill -rotate-[0.5deg]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface SketchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}

export const SketchButton = React.forwardRef<HTMLButtonElement, SketchButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp: any = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(variants({ variant, size }), "hover:rotate-0", className)} {...props} />;
  },
);
SketchButton.displayName = "SketchButton";