import { CONVICTION_CONFIG } from "@/lib/conviction";

interface Props {
  value: number;
  capped?: boolean;
  turnsLeft?: number | null;
}

export function ConvictionGauge({ value, capped, turnsLeft }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const threshold = CONVICTION_CONFIG.WIN_THRESHOLD * 100;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Conviction de la table</span>
        <span className="text-2xl font-semibold tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-secondary overflow-hidden">
        <div className="absolute inset-y-0 left-0 gradient-conviction rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${threshold}%` }} aria-hidden />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Objectif : {threshold}%</span>
        {turnsLeft != null && (
          <span>{turnsLeft} {turnsLeft === 1 ? "tour restant" : "tours restants"}</span>
        )}
      </div>
      {capped && (
        <p className="mt-2 text-xs text-amber-700">Un décideur clé reste réticent — la conviction est plafonnée.</p>
      )}
    </div>
  );
}