import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-hand font-semibold cursor-pointer transition-[transform,box-shadow,background-color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--marker-teal)] text-white ink-border sketch-shadow -rotate-[0.5deg] hover:rotate-0 hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none r-pill",
        destructive:
          "bg-[var(--marker-red)] text-white ink-border sketch-shadow -rotate-[0.5deg] hover:rotate-0 hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none r-pill",
        outline:
          "bg-[var(--paper-2)] text-ink ink-border sketch-shadow -rotate-[0.5deg] hover:rotate-0 hover:-translate-y-0.5 hover:sketch-shadow-lg active:translate-x-1 active:translate-y-1 active:!shadow-none r-pill",
        secondary:
          "bg-[var(--paper-sunk)] text-ink ink-border-thin sketch-shadow-sm hover:-translate-y-0.5 hover:sketch-shadow active:translate-x-1 active:translate-y-1 active:!shadow-none r-pill",
        ghost: "text-ink hover:bg-[var(--paper-sunk)] rounded-md",
        link: "text-[var(--marker-teal)] underline underline-offset-4 decoration-2 decoration-wavy hover:opacity-80",
      },
      size: {
        default: "h-10 px-5 py-2 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-lg",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
