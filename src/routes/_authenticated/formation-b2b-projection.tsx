import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LineChart, ShieldAlert } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { QuitToHome } from "@/components/b2b/QuitToHome";
import { MOCK_B2B_PROJECTION } from "@/lib/b2b-mock";

export const Route = createFileRoute("/_authenticated/formation-b2b-projection")({
  component: B2BProjectionPage,
});

function B2BProjectionPage() {
  const navigate = useNavigate();
  const data = MOCK_B2B_PROJECTION; // Mock_B2B

  return (
    <div className="min-h-screen page-fade" style={{ background: "#F4EFE6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitToHome />

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="handwritten" style={{ fontSize: "1.1rem", color: "#6B7280" }}>
              Carnet · Projection B2B · Mock_B2B
            </p>
            <h1 className="handwritten" style={{ fontSize: "2.8rem", color: "var(--ink)", lineHeight: 1 }}>
              Trajectoires d'ARR
            </h1>
          </div>
          <button
            onClick={() => navigate({ to: "/formation-b2b-report" })}
            className="sketch-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            <span style={{ color: "var(--ink)" }}>Retour au debrief</span>
          </button>
        </header>

        {/* ARR Chart */}
        <section
          className="paper-bg"
          style={{
            padding: "1.5rem",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--sketch-radius-soft)",
            boxShadow: "4px 5px 0 rgba(0,0,0,0.06)",
            background: "var(--paper)",
          }}
        >
          <p className="handwritten flex items-center gap-2" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
            <LineChart size={20} style={{ color: "var(--marker-teal)" }} /> ARR projeté (k€) — 6 / 12 / 24 / 36 mois
          </p>
          <PencilArrChart data={data} />
          <div className="mt-3 flex flex-wrap gap-4">
            {data.trajectories.map((t) => (
              <span key={t.id} className="handwritten flex items-center gap-2" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
                <span style={{ display: "inline-block", width: 22, height: 4, background: t.color, borderRadius: 2 }} />
                {t.label}
              </span>
            ))}
          </div>
        </section>

        {/* Risk matrix */}
        <section
          className="paper-bg"
          style={{
            padding: "1.5rem",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--sketch-radius-soft)",
            boxShadow: "4px 5px 0 rgba(0,0,0,0.06)",
            background: "var(--paper)",
          }}
        >
          <p className="handwritten flex items-center gap-2" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
            <ShieldAlert size={20} style={{ color: "var(--marker-red)" }} /> Matrice des risques (Probabilité × Impact)
          </p>
          <WatercolorRiskMatrix risks={data.risks} />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {data.risks.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2"
                style={{ color: "var(--ink)", fontSize: "0.95rem" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14, height: 14, borderRadius: "50%",
                    background: r.color, opacity: 0.6,
                    border: "1px solid var(--ink)",
                  }}
                />
                {r.label} <span style={{ color: "#6B7280" }}>(P{r.probability}/I{r.impact})</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------- ARR chart "crayon SVG" ---------- */

function PencilArrChart({ data }: { data: typeof MOCK_B2B_PROJECTION }) {
  const W = 760, H = 320, PAD = 50;
  const xs = data.months;
  const maxArr = Math.max(...data.trajectories.flatMap((t) => t.arr)) * 1.1;
  const xScale = (m: number) => PAD + ((m - xs[0]) / (xs[xs.length - 1] - xs[0])) * (W - PAD * 2);
  const yScale = (v: number) => H - PAD - (v / maxArr) * (H - PAD * 2);

  const pathFor = (arr: number[]) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(xs[i])} ${yScale(v)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Courbes ARR">
      <defs>
        <filter id="pencil-rough" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
        <filter id="pencil-grain">
          <feTurbulence type="fractalNoise" baseFrequency="2.5" numOctaves="2" seed="5" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Axes */}
      <g filter="url(#pencil-rough)" stroke="var(--ink)" strokeWidth={1.4} fill="none" strokeLinecap="round">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} />
        {/* Grid horizontal */}
        {[0.25, 0.5, 0.75, 1].map((k, i) => (
          <line
            key={i}
            x1={PAD} y1={H - PAD - k * (H - PAD * 2)}
            x2={W - PAD} y2={H - PAD - k * (H - PAD * 2)}
            strokeOpacity={0.15}
          />
        ))}
      </g>

      {/* Trajectoires */}
      {data.trajectories.map((t) => (
        <g key={t.id} filter="url(#pencil-rough)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={pathFor(t.arr)} stroke={t.color} strokeWidth={2.6} opacity={0.95} />
          <path d={pathFor(t.arr)} stroke={t.color} strokeWidth={1.2} opacity={0.5} transform="translate(0.8,0.8)" />
          {t.arr.map((v, i) => (
            <circle key={i} cx={xScale(xs[i])} cy={yScale(v)} r={4.5} fill={t.color} stroke="var(--ink)" strokeWidth={1} />
          ))}
        </g>
      ))}

      {/* X labels */}
      {xs.map((m) => (
        <text key={m} x={xScale(m)} y={H - PAD + 22} textAnchor="middle"
              style={{ fontFamily: "Caveat, cursive", fontSize: 18, fill: "var(--ink)" }}>
          {m} mois
        </text>
      ))}
      {/* Y label */}
      <text x={PAD - 14} y={PAD - 16} textAnchor="start"
            style={{ fontFamily: "Caveat, cursive", fontSize: 16, fill: "#6B7280" }}>
        k€ ARR
      </text>

      {/* Grain overlay */}
      <rect x={0} y={0} width={W} height={H} filter="url(#pencil-grain)" />
    </svg>
  );
}

/* ---------- Risk matrix avec taches d'aquarelle ---------- */

function WatercolorRiskMatrix({
  risks,
}: {
  risks: { id: string; label: string; probability: number; impact: number; color: string }[];
}) {
  const W = 560, H = 420, PAD = 60;
  const cell = (n: number) => PAD + ((n - 0.5) / 5) * (W - PAD * 2);
  const cellY = (n: number) => H - PAD - ((n - 0.5) / 5) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Matrice de risques">
      <defs>
        <filter id="wc-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="9" />
          <feDisplacementMap in="SourceGraphic" scale="6" />
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="wc-grid" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.3" />
        </filter>
      </defs>

      {/* Background quadrants tint */}
      <g opacity={0.12}>
        <rect x={PAD} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#10B981" />
        <rect x={W / 2} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#F59E0B" />
        <rect x={PAD} y={H / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#F59E0B" />
        <rect x={W / 2} y={H / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#EF4444" />
      </g>

      {/* Grid */}
      <g filter="url(#wc-grid)" stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={1.2} fill="none">
        {Array.from({ length: 6 }).map((_, i) => {
          const x = PAD + (i / 5) * (W - PAD * 2);
          const y = PAD + (i / 5) * (H - PAD * 2);
          return (
            <g key={i}>
              <line x1={x} y1={PAD} x2={x} y2={H - PAD} />
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} />
            </g>
          );
        })}
      </g>

      {/* Axis labels */}
      {[1, 2, 3, 4, 5].map((n) => (
        <text key={`x${n}`} x={cell(n)} y={H - PAD + 22} textAnchor="middle"
              style={{ fontFamily: "Caveat, cursive", fontSize: 16, fill: "var(--ink)" }}>
          {n}
        </text>
      ))}
      {[1, 2, 3, 4, 5].map((n) => (
        <text key={`y${n}`} x={PAD - 16} y={cellY(n) + 5} textAnchor="end"
              style={{ fontFamily: "Caveat, cursive", fontSize: 16, fill: "var(--ink)" }}>
          {n}
        </text>
      ))}
      <text x={W / 2} y={H - 12} textAnchor="middle"
            style={{ fontFamily: "Caveat, cursive", fontSize: 20, fill: "var(--ink)" }}>
        Probabilité →
      </text>
      <text x={18} y={H / 2} textAnchor="middle"
            transform={`rotate(-90, 18, ${H / 2})`}
            style={{ fontFamily: "Caveat, cursive", fontSize: 20, fill: "var(--ink)" }}>
        Impact →
      </text>

      {/* Watercolor blobs */}
      {risks.map((r) => {
        const x = cell(r.probability);
        const y = cellY(r.impact);
        return (
          <g key={r.id}>
            <g filter="url(#wc-rough)">
              <ellipse cx={x} cy={y} rx={42} ry={36} fill={r.color} opacity={0.32} />
              <ellipse cx={x + 4} cy={y - 2} rx={28} ry={24} fill={r.color} opacity={0.45} />
              <ellipse cx={x - 6} cy={y + 4} rx={18} ry={14} fill={r.color} opacity={0.55} />
            </g>
            <text x={x} y={y + 4} textAnchor="middle"
                  style={{ fontFamily: "Caveat, cursive", fontSize: 17, fill: "var(--ink)" }}>
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}