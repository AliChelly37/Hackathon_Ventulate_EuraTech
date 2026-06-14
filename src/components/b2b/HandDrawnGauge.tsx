import { useState } from "react";

/**
 * Jauge dessinée à la main (style Sketchbook) — 0 → 100 %.
 * Utilisée pour la phase "Predict" du parcours B2B.
 */
export function HandDrawnGauge({
  value,
  onChange,
  label = "Probabilité de signer",
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const v = disabled ? value : local;
  const pct = Math.max(0, Math.min(100, v));

  return (
    <div style={{ width: "100%" }}>
      <div className="flex items-baseline justify-between">
        <span className="handwritten" style={{ fontSize: "1.2rem", color: "var(--ink)" }}>
          {label}
        </span>
        <span className="handwritten" style={{ fontSize: "1.6rem", color: "var(--marker-teal)" }}>
          {pct}%
        </span>
      </div>

      <svg viewBox="0 0 200 80" width="100%" height="80" aria-hidden>
        <defs>
          <filter id="gauge-rough" x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.3" />
          </filter>
        </defs>
        <g filter="url(#gauge-rough)" fill="none" strokeLinecap="round">
          <path d="M 15 55 Q 100 5 185 55" stroke="var(--ink)" strokeWidth="2" />
          <path
            d={`M 15 55 Q ${15 + (pct / 100) * 85} ${55 - (pct / 100) * 45} ${15 + (pct / 100) * 170} ${55 - Math.sin((pct / 100) * Math.PI) * 35}`}
            stroke="var(--marker-teal)"
            strokeWidth="4"
          />
          <circle
            cx={15 + (pct / 100) * 170}
            cy={55 - Math.sin((pct / 100) * Math.PI) * 35}
            r="5"
            fill="var(--marker-teal)"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          setLocal(n);
          onChange(n);
        }}
        style={{ width: "100%", accentColor: "var(--marker-teal)" }}
      />
    </div>
  );
}