import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Highlighter wash sweeping behind inline text. */
export function Highlighter({
  children,
  color = "var(--highlight)",
  delay = 0.3,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block", className)}>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: "55% 0 8% 0",
          background: color,
          transformOrigin: "left center",
          mixBlendMode: "multiply",
          zIndex: 0,
        }}
      />
      <span className="relative z-[1]">{children}</span>
    </span>
  );
}

export function SketchBadge({
  children,
  color = "var(--marker-teal)",
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-0.5 font-hand font-semibold text-sm r-pill",
        className,
      )}
      style={{ border: `1.5px solid ${color}`, color, transform: "rotate(-0.5deg)" }}
    >
      {children}
    </span>
  );
}