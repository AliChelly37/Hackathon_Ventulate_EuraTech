import { stateColor } from "@/lib/adapters/negociation";

export function Thermometer({ conviction }: { conviction: number }) {
  const pct = Math.max(0, Math.min(1, conviction)) * 100;
  const color = stateColor(conviction);
  return (
    <div
      style={{
        width: 10,
        height: 56,
        background: "#F3F4F6",
        border: "1px solid var(--ink)",
        borderRadius: 6,
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`Conviction ${Math.round(pct)}%`}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${pct}%`,
          background: color,
          transition: "height 0.5s ease, background-color 0.6s ease",
        }}
      />
    </div>
  );
}