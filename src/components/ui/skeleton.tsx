import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[var(--paper-sunk)] r-2 border border-dashed border-[var(--ink-faint)]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

if (typeof document !== "undefined" && !document.getElementById("__shimmer_kf")) {
  const s = document.createElement("style");
  s.id = "__shimmer_kf";
  s.textContent = "@keyframes shimmer { to { transform: translateX(100%); } }";
  document.head.appendChild(s);
}

export { Skeleton };
