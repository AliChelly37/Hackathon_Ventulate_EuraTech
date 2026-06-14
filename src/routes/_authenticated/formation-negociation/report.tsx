import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Trophy, Handshake, X, Zap, Sparkles, Loader2, RefreshCw, PlusCircle, EyeOff, Target, Lightbulb } from "lucide-react";
import { generateReport } from "@/lib/session.functions";
import { supabase } from "@/integrations/supabase/client";
import { SketchAvatar } from "@/components/nego/SketchAvatar";
import { QuitButton } from "@/components/nego/QuitButton";
import { BackButton } from "@/components/BackButton";

const search = z.object({ id: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/_authenticated/formation-negociation/report")({
  validateSearch: zodValidator(search),
  component: ReportPage,
});

interface ReportShape {
  outcome: string;
  final_t: number;
  positives: string[];
  negatives: string[];
  tips: string[];
  timeline: Array<{ kind: string; turn?: number; text: string }>;
}

interface AgentRow {
  id: string;
  name: string;
  role: string;
  weight: number;
  conviction: number;
  priorities: string | null;
}

function Spiral() {
  return (
    <svg width={24} height={600} aria-hidden style={{ position: "absolute", top: 24, left: 8 }}>
      {Array.from({ length: 15 }).map((_, i) => (
        <circle key={i} cx={12} cy={20 + i * 40} r={5} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function Radar({ values }: { values: { label: string; value: number }[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 100;
  const n = values.length;
  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const radius = (Math.max(0, Math.min(10, v.value)) / 10) * r;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  });
  const grid = [0.25, 0.5, 0.75, 1];
  return (
    <svg width={size} height={size} aria-hidden>
      {grid.map((g, gi) => (
        <polygon
          key={gi}
          points={values
            .map((_, i) => {
              const a = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + Math.cos(a) * r * g},${cy + Math.sin(a) * r * g}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}
      {values.map((_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="var(--ink)"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={points.map((p) => p.join(",")).join(" ")}
        fill="var(--marker-teal)"
        fillOpacity={0.25}
        stroke="var(--marker-teal)"
        strokeWidth={2}
      />
      {values.map((v, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(a) * (r + 22);
        const ly = cy + Math.sin(a) * (r + 22);
        return (
          <text
            key={v.label}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="handwritten"
            style={{ fontSize: 14, fill: "var(--ink)" }}
          >
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}

function ReportPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const gen = useServerFn(generateReport);
  const [report, setReport] = useState<ReportShape | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: s } = await supabase
          .from("sessions")
          .select("status")
          .eq("id", id)
          .single();
        if (s && s.status === "playing") {
          const { data: ags } = await supabase
            .from("agents")
            .select("weight, conviction")
            .eq("session_id", id);
          const totalW = (ags ?? []).reduce((s, a) => s + Number(a.weight), 0) || 1;
          const tcg = (ags ?? []).reduce((s, a) => s + Number(a.weight) * Number(a.conviction), 0) / totalW;
          await supabase
            .from("sessions")
            .update({ status: tcg >= 0.7 ? "won" : "lost" })
            .eq("id", id);
        }
        const { data: ags } = await supabase
          .from("agents")
          .select("id, name, role, weight, conviction, priorities")
          .eq("session_id", id)
          .order("order_index");
        setAgents(((ags ?? []) as unknown) as AgentRow[]);
        const r = await gen({ data: { session_id: id } });
        setReport(r as unknown as ReportShape);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    })();
  }, [id, gen]);

  const verdict = !report
    ? null
    : report.outcome === "won"
    ? { label: "Victoire", color: "var(--marker-green)", Icon: Trophy }
    : report.outcome === "lost"
    ? { label: "Défaite", color: "var(--marker-red)", Icon: X }
    : { label: "Match nul", color: "var(--marker-amber)", Icon: Handshake };

  const tcgFinal = report ? Math.round(report.final_t * 100) : 0;
  const pivots = report?.timeline.filter((t) => t.kind === "pivot") ?? [];

  const radarAxes = useMemo(() => {
    const base = tcgFinal / 10;
    const positives = report?.positives.length ?? 0;
    const negatives = report?.negatives.length ?? 0;
    return [
      { label: "Clarté", value: Math.min(10, Math.round(base + positives * 0.4)) },
      { label: "Empathie", value: Math.min(10, Math.round(base - 0.5 + positives * 0.3)) },
      { label: "Structure", value: Math.min(10, Math.round(base + 0.5)) },
      { label: "Rythme", value: Math.min(10, Math.max(1, Math.round(base + pivots.length * 0.5))) },
      { label: "Impact", value: Math.min(10, Math.max(1, Math.round(base - negatives * 0.4 + 1))) },
    ];
  }, [tcgFinal, report, pivots.length]);

  function hiddenTruthFor(agent: AgentRow): string {
    const p = (agent.priorities ?? "").trim();
    if (!p) return "Cherchait surtout à protéger ses intérêts personnels avant ceux du groupe.";
    return p.length > 160 ? p.slice(0, 157) + "…" : p;
  }

  return (
    <div className="nego-bg min-h-screen" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div style={{ position: "relative", background: "var(--paper)", border: "1.5px solid var(--ink)", borderRadius: 8, padding: "2rem 2rem 2rem 3.5rem", boxShadow: "3px 4px 0 rgba(0,0,0,0.07)" }}>
          <Spiral />

          {error && <p style={{ color: "var(--marker-red)" }}>{error}</p>}
          {!report && !error && (
            <div className="flex items-center gap-2" style={{ color: "var(--marker-teal)" }}>
              <Loader2 className="animate-spin" />
              <span className="handwritten" style={{ fontSize: "1.2rem" }}>Analyse de la négociation…</span>
            </div>
          )}

          {report && verdict && (
            <>
              {/* TCG final */}
              <section className="text-center page-fade">
                <p className="handwritten" style={{ fontSize: "1.2rem", color: "#6B7280" }}>Score final</p>
                <p className="handwritten tabular-nums" style={{ fontSize: 80, lineHeight: 1, color: verdict.color }}>{tcgFinal}%</p>
                <div className="inline-flex items-center gap-2 mt-2" style={{ padding: "0.3rem 0.8rem", border: `1.5px solid ${verdict.color}`, color: verdict.color, borderRadius: 999 }}>
                  <verdict.Icon size={18} /> <span className="handwritten" style={{ fontSize: "1.2rem" }}>{verdict.label}</span>
                </div>
              </section>

              {/* L'arc de la négociation */}
              <section className="mt-10 page-fade">
                <h2 className="handwritten" style={{ fontSize: "1.7rem", color: "var(--ink)" }}>
                  L'arc de la négociation
                </h2>
                <div className="mt-4" style={{ position: "relative", paddingLeft: 28 }}>
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 6,
                      bottom: 6,
                      borderLeft: "2px dashed var(--marker-teal)",
                    }}
                  />
                  {(pivots.length > 0
                    ? pivots
                    : [{ turn: 1, text: "Pas assez de tours pour identifier un tournant clair." }]
                  ).map((p, i) => {
                    const pos =
                      p.text.toLowerCase().includes("efficace") ||
                      p.text.toLowerCase().includes("bon") ||
                      p.text.toLowerCase().includes("réussi");
                    const Icon = pos ? Sparkles : Zap;
                    const color = pos ? "var(--marker-green)" : "var(--marker-red)";
                    return (
                      <div key={i} className="flex items-start gap-3 mb-3" style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: -22,
                            top: 4,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "var(--paper)",
                            border: `2px solid ${color}`,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Icon size={10} color={color} />
                        </span>
                        <span
                          className="handwritten tabular-nums"
                          style={{ color: "var(--marker-teal)", minWidth: 40 }}
                        >
                          T{p.turn ?? i + 1}
                        </span>
                        <span style={{ color: "var(--ink)" }}>{p.text}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Ce qu'ils ne vous disaient pas */}
              {agents.length > 0 && (
                <section
                  className="mt-10 page-fade sketch-card-soft"
                  style={{ background: "#FFFBEB", borderColor: "var(--marker-amber)" }}
                >
                  <div className="flex items-center gap-2">
                    <EyeOff size={20} color="var(--marker-amber)" />
                    <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--marker-amber)" }}>
                      Ce qu'ils ne vous disaient pas
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {agents.map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <SketchAvatar id={a.id} conviction={Number(a.conviction)} size={48} />
                        <div style={{ flex: 1 }}>
                          <p className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                            {a.name} <span style={{ color: "#6B7280", fontSize: "0.95rem" }}>· {a.role}</span>
                          </p>
                          <p style={{ color: "var(--ink)", fontSize: "0.95rem", marginTop: 2 }}>
                            <em>« {hiddenTruthFor(a)} »</em>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Retour de chaque membre */}
              {agents.length > 0 && (
                <section className="mt-10 page-fade">
                  <h2 className="handwritten" style={{ fontSize: "1.7rem", color: "var(--ink)" }}>
                    Retour de chaque membre
                  </h2>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {agents.map((a) => {
                      const conv = Math.round(Number(a.conviction) * 100);
                      const color =
                        conv >= 65
                          ? "var(--marker-green)"
                          : conv >= 35
                          ? "var(--marker-amber)"
                          : "var(--marker-red)";
                      return (
                        <div key={a.id} className="sketch-card-soft flex items-center gap-3">
                          <SketchAvatar id={a.id} conviction={Number(a.conviction)} size={48} />
                          <div style={{ flex: 1 }}>
                            <p className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                              {a.name}
                            </p>
                            <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>{a.role}</p>
                          </div>
                          <span
                            className="handwritten tabular-nums"
                            style={{ fontSize: "1.4rem", color }}
                          >
                            {conv}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Ton style à l'oral */}
              <section className="mt-10 page-fade">
                <h2 className="handwritten" style={{ fontSize: "1.7rem", color: "var(--ink)" }}>
                  Ton style à l'oral
                </h2>
                <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
                  <Radar values={radarAxes} />
                  <ul className="space-y-1" style={{ flex: 1 }}>
                    {radarAxes.map((a) => (
                      <li key={a.label} className="flex items-center justify-between gap-3">
                        <span style={{ color: "var(--ink)" }}>{a.label}</span>
                        <span
                          className="handwritten tabular-nums"
                          style={{ color: "var(--marker-teal)", fontSize: "1.2rem" }}
                        >
                          {a.value}/10
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Conseils — 2 encadrés */}
              <section className="mt-10 grid md:grid-cols-2 gap-4 page-fade">
                <div className="sketch-card-soft" style={{ background: "#ECFDF5" }}>
                  <div className="flex items-center gap-2">
                    <Target size={18} color="var(--marker-green)" />
                    <h3 className="handwritten" style={{ fontSize: "1.4rem", color: "var(--marker-green)" }}>
                      Tes prochains axes
                    </h3>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {report.tips.slice(0, 2).map((t, i) => (
                      <li key={i} style={{ color: "var(--ink)" }}>• {t}</li>
                    ))}
                    {report.positives.map((p, i) => (
                      <li key={`p${i}`} style={{ color: "var(--ink)" }}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="sketch-card-soft" style={{ background: "#EEF2FF" }}>
                  <div className="flex items-center gap-2">
                    <Lightbulb size={18} color="var(--marker-violet)" />
                    <h3 className="handwritten" style={{ fontSize: "1.4rem", color: "var(--marker-violet)" }}>
                      Ce que ton produit pourrait améliorer
                    </h3>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {report.negatives.map((n, i) => (
                      <li key={i} style={{ color: "var(--ink)" }}>• {n}</li>
                    ))}
                    {report.tips.slice(2).map((t, i) => (
                      <li key={`t${i}`} style={{ color: "var(--ink)" }}>• {t}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* CTAs */}
              <div className="mt-10 flex justify-center gap-3">
                <button onClick={() => navigate({ to: "/formation-negociation/setup" })} className="sketch-btn">
                  <RefreshCw size={16} /> <span style={{ color: "var(--ink)" }}>Rejouer</span>
                </button>
                <button onClick={() => navigate({ to: "/skills" })} className="sketch-btn sketch-btn-primary">
                  <PlusCircle size={16} /> <span style={{ color: "var(--ink)" }}>Nouveau produit</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}