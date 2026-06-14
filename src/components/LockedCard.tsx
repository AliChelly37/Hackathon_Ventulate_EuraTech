import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LockedCard({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("relative rounded-2xl border bg-card/50 p-6 opacity-70 cursor-not-allowed", className)} aria-disabled>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <span className="absolute -top-2 right-4 text-[10px] font-medium uppercase tracking-wide bg-secondary px-2 py-1 rounded-full">Bientôt</span>
    </div>
  );
}