import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const RADII = ["r-1", "r-2", "r-3"] as const;
const TILTS = ["rotate-[1deg]", "-rotate-[1deg]", "rotate-[0.5deg]", "-rotate-[0.5deg]"] as const;

export interface SketchCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  index?: number;
  interactive?: boolean;
  flat?: boolean;
}

export const SketchCard = React.forwardRef<HTMLDivElement, SketchCardProps>(
  ({ className, index = 0, interactive, flat, children, ...props }, ref) => {
    const radius = RADII[index % RADII.length];
    const tilt = flat ? "" : TILTS[index % TILTS.length];
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -3, rotate: 0, boxShadow: "6px 6px 0 var(--ink)" } : undefined}
        transition={spring.gentle}
        className={cn(
          "bg-[var(--paper-2)] ink-border-thin sketch-shadow p-6 md:p-7",
          radius,
          tilt,
          interactive && "cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
SketchCard.displayName = "SketchCard";