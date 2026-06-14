import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function ActiveCard({ title, description, onClick, className }: { title: string; description?: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("group relative rounded-2xl border-2 border-primary/30 bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
      </div>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
    </button>
  );
}