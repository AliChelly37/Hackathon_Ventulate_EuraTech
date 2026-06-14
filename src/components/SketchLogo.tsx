import { cn } from "@/lib/utils";

/**
 * Hand-drawn sketch logo for Ventulate.
 * A wobbly speech bubble crossed by a rising conviction arrow,
 * inked with a slightly irregular stroke.
 */
export function SketchLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* watercolor wash */}
      <path
        d="M10 18 C 8 10, 22 6, 34 7 C 50 8, 58 16, 56 28 C 55 38, 46 44, 34 43 L 24 50 L 26 41 C 16 39, 11 30, 10 18 Z"
        fill="var(--marker-teal)"
        opacity="0.22"
      />
      {/* speech bubble ink */}
      <path
        d="M11 19 C 9 11, 23 6, 34 7 C 50 8, 58 17, 56 28 C 55 38, 46 44, 34 43 L 24 50 L 26.5 41.2 C 16 39, 11.5 30, 11 19 Z"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* rising arrow inside */}
      <path
        d="M19 33 C 24 30, 28 29, 32 26 C 36.5 22.5, 40 19, 46 16"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 15.5 L 46.5 15.8 L 45.8 22"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* sparkle dot */}
      <circle cx="17" cy="14" r="1.4" fill="var(--marker-amber)" />
    </svg>
  );
}