import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * "The Committee Warms Up" — ambient looping sketch on the right page of /auth.
 * Self-contained, decorative (pointer-events: none), clipped to its column.
 * Boil texture via SVG feTurbulence stepped at ~9fps. Master loop ~10s.
 */

type Persona = {
  id: "marc" | "sarah" | "karim";
  name: string;
  role: string;
  accent: string;
  x: number; // cx in viewBox
  y: number; // cy in viewBox
};

const PERSONAS: Persona[] = [
  { id: "marc",  name: "Marc",  role: "DAF",  accent: "var(--marker-red)",   x: 110, y: 200 },
  { id: "sarah", name: "Sarah", role: "IT",   accent: "var(--marker-amber)", x: 280, y: 150 },
  { id: "karim", name: "Karim", role: "Chef", accent: "var(--marker-teal)",  x: 450, y: 200 },
];

const BUBBLES: { from: Persona["id"]; text: string; appear: number; resolve: number }[] = [
  { from: "marc",  text: "On a déjà essayé…", appear: 2.6, resolve: 3.7 },
  { from: "sarah", text: "149€/mois ?",       appear: 3.2, resolve: 4.3 },
  { from: "karim", text: "Le ROI ?",          appear: 3.9, resolve: 5.0 },
  { from: "marc",  text: "Des références ?",  appear: 4.6, resolve: 5.7 },
];

const LOOP = 10; // seconds

export function CommitteeAnimation({ staticFrame = false }: { staticFrame?: boolean }) {
  const reduce = useReducedMotion();
  const isStatic = staticFrame || !!reduce;

  // Loop clock 0..LOOP, driven by rAF; paused on tab hidden / offscreen.
  const [t, setT] = useState(isStatic ? 8 : 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (isStatic) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      if (visibleRef.current) {
        const elapsed = ((now - start) / 1000) % LOOP;
        setT(elapsed);
      } else {
        start = now - t * 1000;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => { visibleRef.current = !document.hidden; if (!document.hidden) start = performance.now() - t * 1000; };
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | null = null;
    if (containerRef.current && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const e = entries[0];
        visibleRef.current = e.isIntersecting && !document.hidden;
        if (visibleRef.current) start = performance.now() - t * 1000;
      });
      io.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic]);

  // Boil seed (~9fps)
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (isStatic) return;
    const id = setInterval(() => setSeed((s) => (s + 1) % 5), 110);
    return () => clearInterval(id);
  }, [isStatic]);

  // Phase helpers
  const drawIn = (i: number) => {
    if (isStatic) return 1;
    const start = 0.1 + i * 0.45;
    return Math.max(0, Math.min(1, (t - start) / 0.9));
  };

  const convictionFor = (i: number) => {
    if (isStatic) return 0.78;
    // Climb from 0.22 → 0.78 over phase 2-3 (2.5s → 7.5s), staggered.
    const base = 0.22;
    const target = 0.78;
    const climbStart = 2.5 + i * 0.4;
    const climbEnd = 7.4;
    const k = Math.max(0, Math.min(1, (t - climbStart) / (climbEnd - climbStart)));
    // Reset crossfade in last 1s
    const fade = t > 9 ? (10 - t) : 1;
    return base + (target - base) * k * fade + base * (1 - fade);
  };

  const smile = (i: number) => {
    if (isStatic) return 1;
    const k = Math.max(0, Math.min(1, (t - (4 + i * 0.5)) / 1.5));
    return k * (t > 9 ? (10 - t) : 1);
  };

  const showVictory = isStatic ? true : (t >= 7.6 && t < 9.4);
  const victoryFade = isStatic ? 1 : Math.max(0, Math.min(1, t < 8.2 ? (t - 7.6) / 0.6 : (9.4 - t) / 0.6));
  const resetFade = isStatic ? 1 : (t > 9 ? Math.max(0, (10 - t)) : 1);

  // Boil filter (discrete states via seed)
  const baseFreq = 0.018 + (seed % 3) * 0.004;
  const scale = 1.6 + (seed % 4) * 0.4;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="relative w-full h-full"
      style={{ pointerEvents: "none", isolation: "isolate", overflow: "hidden" }}
    >
      {/* Soft paper wash to differentiate the right page */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, color-mix(in srgb, var(--marker-teal) 8%, transparent), transparent 70%), radial-gradient(ellipse at 30% 80%, color-mix(in srgb, var(--marker-amber) 10%, transparent), transparent 60%)",
        }}
      />

      <svg
        viewBox="0 0 560 420"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: resetFade, transition: "opacity 0.4s ease" }}
      >
        <defs>
          <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency={baseFreq} numOctaves={2} seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale={scale} />
          </filter>
        </defs>

        <g filter="url(#boil)">
          {/* Table arc */}
          <path
            d="M 60 320 Q 280 380 500 320"
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.55}
          />

          {PERSONAS.map((p, i) => (
            <PersonaAvatar
              key={p.id}
              persona={p}
              draw={drawIn(i)}
              conviction={convictionFor(i)}
              smile={smile(i)}
            />
          ))}

          {/* Thermometers under each persona */}
          {PERSONAS.map((p, i) => (
            <Thermometer
              key={"th-" + p.id}
              x={p.x - 4}
              y={p.y + 60}
              value={convictionFor(i)}
            />
          ))}
        </g>

        {/* Speech bubbles (not boiled, to keep text legible) */}
        {!isStatic &&
          BUBBLES.map((b, idx) => {
            const p = PERSONAS.find((x) => x.id === b.from)!;
            const visible = t >= b.appear && t <= b.resolve + 0.4;
            if (!visible) return null;
            const resolving = t > b.resolve;
            return (
              <SpeechBubble
                key={idx}
                x={p.x + 35}
                y={p.y - 50}
                text={b.text}
                resolving={resolving}
              />
            );
          })}

        {/* Victory burst */}
        {showVictory && <StarBurst opacity={victoryFade} />}
      </svg>

      {/* Victory readout */}
      <div
        className="absolute left-1/2 -translate-x-1/2 font-hand text-2xl"
        style={{
          bottom: "12%",
          color: "var(--marker-teal)",
          opacity: showVictory ? victoryFade : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        TCG 72% ✓
      </div>

      {/* Persona name labels */}
      <svg viewBox="0 0 560 420" className="absolute inset-0 w-full h-full" style={{ opacity: resetFade }}>
        {PERSONAS.map((p, i) => (
          <g key={"lbl-" + p.id} style={{ opacity: drawIn(i) }}>
            <text
              x={p.x}
              y={p.y + 120}
              textAnchor="middle"
              fontFamily="Shantell Sans, Caveat, cursive"
              fontSize="16"
              fill="var(--ink)"
            >
              {p.name}
            </text>
            <text
              x={p.x}
              y={p.y + 138}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="11"
              fill="var(--ink-soft)"
            >
              {p.role}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PersonaAvatar({
  persona,
  draw,
  conviction,
  smile,
}: {
  persona: Persona;
  draw: number;
  conviction: number;
  smile: number;
}) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - draw);

  // Mouth morph: flat (skeptical) → curve up (smile)
  const mouthY = persona.y + 14;
  const flat = `M ${persona.x - 12} ${mouthY} L ${persona.x + 12} ${mouthY}`;
  const happy = `M ${persona.x - 12} ${mouthY - 1} Q ${persona.x} ${mouthY + 8 * smile + 2} ${persona.x + 12} ${mouthY - 1}`;
  const mouthD = smile > 0.05 ? happy : flat;

  return (
    <g style={{ opacity: draw }}>
      {/* Accent ring */}
      <circle
        cx={persona.x}
        cy={persona.y}
        r={r + 5}
        fill="none"
        stroke={persona.accent}
        strokeWidth={2}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        opacity={0.7}
      />
      {/* Face */}
      <circle
        cx={persona.x}
        cy={persona.y}
        r={r}
        fill="var(--paper-2)"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeDasharray={circ}
        strokeDashoffset={dash}
      />
      {/* Eyes */}
      <circle cx={persona.x - 12} cy={persona.y - 6} r={2.2} fill="var(--ink)" />
      <circle cx={persona.x + 12} cy={persona.y - 6} r={2.2} fill="var(--ink)" />
      {/* Brows */}
      <path
        d={`M ${persona.x - 18} ${persona.y - 16 + smile * 2} L ${persona.x - 6} ${persona.y - 14 - smile * 2}`}
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${persona.x + 6} ${persona.y - 14 - smile * 2} L ${persona.x + 18} ${persona.y - 16 + smile * 2}`}
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Mouth */}
      <path d={mouthD} stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Thermometer({ x, y, value }: { x: number; y: number; value: number }) {
  const h = 52;
  const w = 7;
  const fillH = h * Math.max(0, Math.min(1, value));
  const color =
    value > 0.7 ? "var(--marker-green)" : value > 0.5 ? "var(--marker-amber)" : "var(--marker-red)";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth={1.5} rx={3} />
      <rect x={x} y={y + (h - fillH)} width={w} height={fillH} fill={color} rx={3} style={{ transition: "height 0.4s ease" }} />
      {/* 70 tick */}
      <line x1={x - 3} y1={y + h * 0.3} x2={x + w + 3} y2={y + h * 0.3} stroke="var(--ink-faint)" strokeWidth={1} />
    </g>
  );
}

function SpeechBubble({ x, y, text, resolving }: { x: number; y: number; text: string; resolving: boolean }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <path
        d={`M ${x} ${y} Q ${x - 10} ${y - 24} ${x + 20} ${y - 28} L ${x + 110} ${y - 28} Q ${x + 130} ${y - 28} ${x + 130} ${y - 10} Q ${x + 130} ${y + 8} ${x + 110} ${y + 8} L ${x + 30} ${y + 8} Q ${x + 14} ${y + 10} ${x} ${y} Z`}
        fill="var(--paper-2)"
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      {resolving ? (
        <path
          d={`M ${x + 60} ${y - 12} l 6 8 l 14 -18`}
          stroke="var(--marker-green)"
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <text
          x={x + 75}
          y={y - 6}
          textAnchor="middle"
          fontFamily="Shantell Sans, Caveat, cursive"
          fontSize="13"
          fill="var(--ink)"
        >
          {text}
        </text>
      )}
    </motion.g>
  );
}

function StarBurst({ opacity }: { opacity: number }) {
  const stars = [
    { x: 280, y: 80, s: 1 },
    { x: 210, y: 110, s: 0.7 },
    { x: 360, y: 110, s: 0.8 },
    { x: 240, y: 50, s: 0.6 },
    { x: 340, y: 60, s: 0.7 },
  ];
  return (
    <g style={{ opacity }}>
      {stars.map((st, i) => (
        <motion.path
          key={i}
          d={`M ${st.x} ${st.y - 10 * st.s} L ${st.x + 3 * st.s} ${st.y - 3 * st.s} L ${st.x + 10 * st.s} ${st.y} L ${st.x + 3 * st.s} ${st.y + 3 * st.s} L ${st.x} ${st.y + 10 * st.s} L ${st.x - 3 * st.s} ${st.y + 3 * st.s} L ${st.x - 10 * st.s} ${st.y} L ${st.x - 3 * st.s} ${st.y - 3 * st.s} Z`}
          fill="var(--marker-amber)"
          stroke="var(--ink)"
          strokeWidth={1}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.08, type: "spring", stiffness: 320, damping: 14 }}
          style={{ transformOrigin: `${st.x}px ${st.y}px` }}
        />
      ))}
    </g>
  );
}