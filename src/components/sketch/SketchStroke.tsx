import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Self-drawing hand-sketched SVG path. The signature treatment.
 * Use sparingly: hero accents, primary CTAs, headline underlines.
 */
export function SketchStroke({
  d,
  className,
  width = 240,
  height = 16,
  stroke = "var(--ink)",
  strokeWidth = 2.5,
  delay = 0,
  duration = 0.7,
  viewBox,
}: {
  d: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  stroke?: string;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  viewBox?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox ?? `0 0 ${typeof width === "number" ? width : 240} ${typeof height === "number" ? height : 16}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
    >
      <motion.path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { delay, duration, ease: "easeOut" }, opacity: { delay, duration: 0.1 } }}
      />
    </svg>
  );
}

/** Hand-drawn underline that draws itself in under a word. */
export function Underline({ className, delay = 0.2, color = "var(--marker-teal)" }: { className?: string; delay?: number; color?: string }) {
  return (
    <SketchStroke
      className={cn("absolute -bottom-1 left-0 w-full", className)}
      width="100%"
      height={10}
      viewBox="0 0 240 10"
      d="M3 6 C 60 2, 120 9, 237 4"
      stroke={color}
      strokeWidth={3}
      delay={delay}
      duration={0.6}
    />
  );
}

/** Hand-drawn checkmark, draws itself in. */
export function SketchCheck({ size = 18, delay = 0, color = "var(--marker-green)" }: { size?: number; delay?: number; color?: string }) {
  return (
    <SketchStroke
      d="M3 10 L 8 15 L 17 4"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      stroke={color}
      strokeWidth={2.5}
      delay={delay}
      duration={0.3}
    />
  );
}

/** Decorative circle drawn around an element. */
export function SketchCircle({ className, color = "var(--marker-amber)", delay = 0 }: { className?: string; color?: string; delay?: number }) {
  return (
    <SketchStroke
      className={cn("absolute inset-0", className)}
      width="100%"
      height="100%"
      viewBox="0 0 100 60"
      d="M50 4 C 78 4, 96 16, 96 30 C 96 46, 76 56, 50 56 C 22 56, 4 46, 4 30 C 4 14, 22 4, 50 4 Z"
      stroke={color}
      strokeWidth={2}
      delay={delay}
      duration={0.8}
    />
  );
}