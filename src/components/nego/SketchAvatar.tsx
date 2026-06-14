import { useMemo } from "react";

interface Props {
  id: string;
  conviction: number;
  size?: number;
}

/** Avatar SVG 100×100 avec 3 états + filter feTurbulence seedé par id. */
export function SketchAvatar({ id, conviction, size = 64 }: Props) {
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h % 100);
  }, [id]);
  const filterId = `sketch-rough-${id}`;

  const state =
    conviction < 0.35 ? "skeptical" : conviction < 0.65 ? "neutral" : "interested";

  const color =
    state === "skeptical" ? "var(--marker-red)"
    : state === "interested" ? "var(--marker-green)"
    : "var(--ink)";
  const strokeWidth = state === "skeptical" ? 3 : state === "neutral" ? 2 : 1.5;
  const linecap = state === "skeptical" ? "square" : "round";

  const browLeft =
    state === "skeptical" ? "M 28 36 L 44 41"
    : state === "interested" ? "M 28 34 Q 36 28 44 32"
    : "M 28 36 L 44 36";
  const browRight =
    state === "skeptical" ? "M 72 41 L 56 36"
    : state === "interested" ? "M 72 34 Q 64 28 56 32"
    : "M 56 36 L 72 36";
  const mouth =
    state === "skeptical" ? "M 35 70 Q 50 60 65 70"
    : state === "interested" ? "M 35 65 Q 50 78 65 65"
    : "M 36 68 L 64 68";

  const dispScale = 0.4 + (1 - conviction) * 2.8;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={dispScale} />
        </filter>
      </defs>
      <g
        filter={`url(#${filterId})`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap={linecap as "round" | "square"}
        style={{ transition: "stroke 600ms ease, stroke-width 600ms ease" }}
      >
        {/* Visage */}
        <circle cx="50" cy="52" r="32" fill="var(--paper)" />
        {/* Mèches de cheveux */}
        <path d="M 22 38 Q 30 18 50 22" />
        <path d="M 78 38 Q 70 18 50 22" />
        {/* Sourcils */}
        <path d={browLeft} style={{ transition: "d 600ms ease" }} />
        <path d={browRight} style={{ transition: "d 600ms ease" }} />
        {/* Yeux */}
        <circle cx="36" cy="48" r="2.5" fill={color} />
        <circle cx="64" cy="48" r="2.5" fill={color} />
        {/* Nez */}
        <path d="M 50 54 L 48 62 L 52 62" />
        {/* Bouche */}
        <path d={mouth} style={{ transition: "d 600ms ease" }} />
      </g>
    </svg>
  );
}