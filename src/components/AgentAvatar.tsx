import { cn } from "@/lib/utils";
import { convictionColor, moodFor } from "@/lib/conviction";

interface Props {
  name: string;
  conviction: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AgentAvatar({ name, conviction, size = "md", className }: Props) {
  const mood = moodFor(conviction);
  const ring = convictionColor(conviction);
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const dim = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const mouth =
    mood === "skeptical" ? "M 30 64 Q 50 58 70 64" :
    mood === "neutral" ? "M 30 62 L 70 62" :
    mood === "interested" ? "M 30 58 Q 50 68 70 58" :
    "M 28 56 Q 50 76 72 56";
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn("relative rounded-full flex items-center justify-center bg-secondary transition-colors duration-500", dim)}
        style={{ boxShadow: `0 0 0 3px var(--color-background), 0 0 0 6px ${ring}` }}
        aria-label={`${name}, conviction ${Math.round(conviction * 100)}%`}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0">
          <circle cx="35" cy="42" r="4" fill="var(--color-ink)" />
          <circle cx="65" cy="42" r="4" fill="var(--color-ink)" />
          <path d={mouth} stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
        <span className="sr-only">{initials}</span>
      </div>
    </div>
  );
}