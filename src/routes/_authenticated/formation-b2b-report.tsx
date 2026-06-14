import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, AlertTriangle, ArrowRight, Stamp } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { QuitToHome } from "@/components/b2b/QuitToHome";
import { MOCK_B2B_REPORT } from "@/lib/b2b-mock";

export const Route = createFileRoute("/_authenticated/formation-b2b-report")({
  component: B2BReportPage,
  validateSearch: z.object({ mock: z.string().optional() }),
});

function B2BReportPage() {
  const navigate = useNavigate();
  const data = MOCK_B2B_REPORT; // Mode démo Mock_B2B — instantané, zéro API.

  return (
    <div className="min-h-screen page-fade" style={{ background: "#F4EFE6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitToHome />

      {/* Carnet à spirales */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div style={{ position: "relative" }}>
          <SpiralBinding />
          <article
            className="paper-bg"
            style={{
              marginLeft: 36,
              padding: "2.5rem 2rem 3rem",
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--sketch-radius-soft)",
              boxShadow: "4px 6px 0 rgba(0,0,0,0.08)",
              backgroundImage:
                "repeating-linear-gradient(transparent, transparent 31px, rgba(45,45,45,0.08) 32px)",
            }}
          >
            <header className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="handwritten" style={{ fontSize: "1.1rem", color: "#6B7280" }}>
                  Carnet · Formation B2B
                </p>
                <h1 className="handwritten" style={{ fontSize: "3rem", color: "var(--ink)", lineHeight: 1 }}>
                  Debrief du deal
                </h1>
              </div>
              <StampVerdict label={data.verdict} tone={data.verdict_tone} />
            </header>

            {/* Score global */}
            <section className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]">
              <div
                className="text-center"
                style={{
                  border: "2px solid var(--ink)",
                  borderRadius: "var(--sketch-radius-soft)",
                  padding: "1.2rem",
                  background: "#FFFDF7",
                  transform: "rotate(-1.2deg)",
                }}
              >
                <p className="handwritten" style={{ fontSize: "1.1rem", color: "#6B7280" }}>Score global</p>
                <p className="handwritten" style={{ fontSize: "4rem", color: "var(--marker-teal)", lineHeight: 1 }}>
                  {data.score_global}
                </p>
                <p className="handwritten" style={{ fontSize: "1rem", color: "var(--ink)" }}>/ 100</p>
              </div>
              <HandDrawnRadar skills={data.skills} />
            </section>

            {/* Encadrés bien fait / à travailler */}
            <section className="mt-10 grid gap-5 md:grid-cols-2">
              <FeedbackCard
                title="Ce que tu as bien fait"
                icon={<CheckCircle2 size={18} style={{ color: "var(--marker-green)" }} />}
                items={data.wins}
                accent="var(--marker-green)"
                bg="#ECFDF5"
                tilt="-0.6deg"
              />
              <FeedbackCard
                title="À travailler"
                icon={<AlertTriangle size={18} style={{ color: "var(--marker-amber)" }} />}
                items={data.improvements}
                accent="var(--marker-amber)"
                bg="#FFFBEB"
                tilt="0.6deg"
              />
            </section>

            {/* CTA vers projection */}
            <section className="mt-10 flex items-center justify-between flex-wrap gap-3">
              <span className="handwritten" style={{ fontSize: "1.1rem", color: "#6B7280" }}>
                Mode démo · Mock_B2B
              </span>
              <button
                onClick={() => navigate({ to: "/formation-b2b-projection" })}
                className="sketch-btn sketch-btn-primary"
              >
                <span style={{ color: "var(--ink)" }}>Voir la projection ARR</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ---------- composants internes ---------- */

function SpiralBinding() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: 36,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingBlock: 16,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 22,
            height: 14,
            borderRadius: 999,
            border: "1.5px solid var(--ink)",
            background: "linear-gradient(180deg,#bbb,#888)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
            transform: i % 2 === 0 ? "rotate(-3deg)" : "rotate(3deg)",
          }}
        />
      ))}
    </div>
  );
}

function StampVerdict({ label, tone }: { label: string; tone: "win" | "loss" | "draw" }) {
  const color = tone === "win" ? "var(--marker-green)" : tone === "loss" ? "var(--marker-red)" : "var(--marker-amber)";
  return (
    <div
      className="flex items-center gap-2"
      style={{
        border: `3px double ${color}`,
        color,
        padding: "0.5rem 1rem",
        transform: "rotate(-6deg)",
        background: "rgba(255,255,255,0.4)",
        borderRadius: 8,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <Stamp size={20} />
      <span className="handwritten" style={{ fontSize: "1.6rem", letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function HandDrawnRadar({ skills }: { skills: { id: string; label: string; score: number }[] }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 120;
  const n = skills.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const ringPoints = (radius: number) =>
    Array.from({ length: n }).map((_, i) => {
      const a = angle(i);
      return `${cx + Math.cos(a) * radius},${cy + Math.sin(a) * radius}`;
    }).join(" ");

  const dataPoints = skills.map((s, i) => {
    const a = angle(i);
    const rr = (s.score / 100) * r;
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="img" aria-label="Radar des compétences">
      <defs>
        <filter id="radar-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#radar-rough)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[0.33, 0.66, 1].map((k, i) => (
          <polygon
            key={i}
            points={ringPoints(r * k)}
            stroke="var(--ink)"
            strokeOpacity={0.35 + i * 0.2}
            strokeWidth={1.2}
          />
        ))}
        {Array.from({ length: n }).map((_, i) => {
          const a = angle(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * r}
              y2={cy + Math.sin(a) * r}
              stroke="var(--ink)"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(45, 212, 191, 0.25)"
          stroke="var(--marker-teal)"
          strokeWidth={2.5}
        />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--marker-teal)" stroke="var(--ink)" strokeWidth={1.2} />
        ))}
      </g>
      {skills.map((s, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (r + 26);
        const ly = cy + Math.sin(a) * (r + 26);
        return (
          <text
            key={s.id}
            x={lx}
            y={ly}
            textAnchor={Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"}
            dominantBaseline="middle"
            style={{ fontFamily: "Caveat, cursive", fontSize: 18, fill: "var(--ink)" }}
          >
            {s.label} · {s.score}
          </text>
        );
      })}
    </svg>
  );
}

function FeedbackCard({
  title, icon, items, accent, bg, tilt,
}: {
  title: string; icon: React.ReactNode; items: string[]; accent: string; bg: string; tilt: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${accent}`,
        borderRadius: "var(--sketch-radius-soft)",
        padding: "1.1rem 1.2rem",
        transform: `rotate(${tilt})`,
        boxShadow: "3px 3px 0 rgba(0,0,0,0.06)",
      }}
    >
      <p className="handwritten flex items-center gap-2" style={{ fontSize: "1.5rem", color: accent }}>
        {icon} {title}
      </p>
      <ul className="mt-2 space-y-1.5" style={{ color: "var(--ink)" }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: "flex", gap: 8 }}>
            <span style={{ color: accent }}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}