import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { QuitButton } from "@/components/nego/QuitButton";
import { SketchAvatar } from "@/components/nego/SketchAvatar";
import { HandDrawnGauge } from "@/components/b2b/HandDrawnGauge";
import { PostItOption } from "@/components/b2b/PostItOption";
import {
  getB2BSession,
  generateB2BOptions,
  submitB2BPhase,
  type B2BState,
  type B2BPhase,
  type B2BOption,
  type B2BReveal,
} from "@/lib/b2b.functions";

export const Route = createFileRoute("/_authenticated/formation-b2b/simulation")({
  component: B2BSimulation,
  validateSearch: z.object({ id: z.string().uuid() }),
});

const PHASE_LABELS: Record<B2BPhase, string> = {
  decouverte: "Découverte",
  pricing: "Pricing",
  closing: "Closing",
};
const PHASE_ORDER: B2BPhase[] = ["decouverte", "pricing", "closing"];
type Step = "predict" | "act" | "reveal";

function B2BSimulation() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const getFn = useServerFn(getB2BSession);
  const genOpts = useServerFn(generateB2BOptions);
  const submitFn = useServerFn(submitB2BPhase);

  const [state, setState] = useState<B2BState | null>(null);
  const [step, setStep] = useState<Step>("predict");
  const [prediction, setPrediction] = useState(50);
  const [options, setOptions] = useState<B2BOption[] | null>(null);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [reveal, setReveal] = useState<B2BReveal | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { state: s } = await getFn({ data: { id } });
        setState(s);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Session introuvable");
      }
    })();
  }, [getFn, id]);

  const phase = state?.current_phase;
  const isDone = phase === "done";

  async function goAct() {
    if (!state || isDone || !phase) return;
    setLoading(true);
    try {
      const { options } = await genOpts({ data: { id, phase } });
      setOptions(options);
      setStep("act");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur options");
    } finally {
      setLoading(false);
    }
  }

  async function goReveal(idx: number) {
    if (!state || isDone || !phase) return;
    setChoiceIndex(idx);
    setLoading(true);
    try {
      const { reveal, state: next } = await submitFn({
        data: { id, phase, prediction, choice_index: idx },
      });
      setReveal(reveal);
      setState(next);
      setStep("reveal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur soumission");
    } finally {
      setLoading(false);
    }
  }

  function nextPhase() {
    setReveal(null);
    setOptions(null);
    setChoiceIndex(null);
    setPrediction(50);
    setStep("predict");
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9F8F6" }}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-fade" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />

      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT — Decision flow */}
        <div>
          <header className="mb-4">
            <h1 className="handwritten" style={{ fontSize: "2.2rem", color: "var(--ink)" }}>
              {state.product}
            </h1>
            <p style={{ color: "#6B7280", fontSize: "0.95rem" }}>
              {state.price_per_seat} / siège · {state.seats} sièges
            </p>
          </header>

          <PhaseStepper phase={phase} />

          {isDone ? (
            <DoneCard state={state} onRestart={() => navigate({ to: "/formation-b2b/setup" })} />
          ) : (
            <div className="sketch-card-soft paper-bg mt-4" style={{ borderColor: "#2D2D2D" }}>
              <div className="flex items-center justify-between">
                <span className="handwritten" style={{ fontSize: "1.5rem", color: "var(--marker-teal)" }}>
                  Phase : {PHASE_LABELS[phase as B2BPhase]}
                </span>
                <StepBadge step={step} />
              </div>

              {step === "predict" && (
                <div className="mt-5 space-y-4">
                  <p style={{ color: "var(--ink)" }}>
                    Avant de parler : <strong>estime ta probabilité de signer</strong> à l'issue de cette phase.
                  </p>
                  <HandDrawnGauge value={prediction} onChange={setPrediction} />
                  <div className="flex justify-end">
                    <button onClick={goAct} disabled={loading} className="sketch-btn sketch-btn-primary">
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> <span style={{ color: "var(--ink)" }}>Génération…</span></>
                      ) : (
                        <><span style={{ color: "var(--ink)" }}>Voir mes options</span><ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === "act" && options && (
                <div className="mt-5 space-y-3">
                  <p style={{ color: "var(--ink)" }}>
                    Choisis ta réplique au comité.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {options.map((o, i) => (
                      <PostItOption
                        key={i}
                        index={i}
                        text={o.label}
                        selected={choiceIndex === i}
                        disabled={loading}
                        onClick={() => goReveal(i)}
                      />
                    ))}
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Le comité réfléchit…
                    </div>
                  )}
                </div>
              )}

              {step === "reveal" && reveal && (
                <div className="mt-5 space-y-4">
                  <div
                    className="sketch-card-soft"
                    style={{
                      background: reveal.good_move ? "#ECFDF5" : "#FEF2F2",
                      borderColor: reveal.good_move ? "var(--marker-green)" : "var(--marker-red)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {reveal.good_move ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: "var(--marker-green)" }} />
                      ) : (
                        <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: "var(--marker-red)" }} />
                      )}
                      <div>
                        <p className="handwritten" style={{ fontSize: "1.3rem", color: "var(--ink)" }}>
                          Réaction du comité
                        </p>
                        <p style={{ color: "var(--ink)" }}>{reveal.committee_reaction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Marker annotation */}
                  <div
                    style={{
                      position: "relative",
                      padding: "0.9rem 1.1rem",
                      background: "rgba(245, 158, 11, 0.15)",
                      borderLeft: "4px solid var(--marker-amber)",
                      borderRadius: 8,
                      transform: "rotate(-0.4deg)",
                    }}
                  >
                    <span className="handwritten flex items-center gap-1" style={{ fontSize: "1.15rem", color: "var(--marker-amber)" }}>
                      <Sparkles size={16} /> Annotation au marqueur
                    </span>
                    <p className="handwritten" style={{ fontSize: "1.3rem", color: "var(--ink)", marginTop: 2 }}>
                      {reveal.marker_annotation}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span style={{ color: "#6B7280", fontSize: "0.9rem" }}>
                      Ta prédiction : <strong>{prediction}%</strong>
                    </span>
                    <button onClick={nextPhase} className="sketch-btn sketch-btn-primary">
                      <span style={{ color: "var(--ink)" }}>
                        {state.current_phase === "done" ? "Voir le bilan" : `Phase suivante : ${PHASE_LABELS[state.current_phase as B2BPhase]}`}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Buying committee */}
        <aside>
          <div className="sketch-card-soft paper-bg" style={{ borderColor: "#2D2D2D" }}>
            <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
              Comité d'achat
            </h2>
            <div className="mt-3 space-y-4">
              {state.agents.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <SketchAvatar id={a.id} conviction={a.conviction} size={64} />
                  <div className="flex-1">
                    <p className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                      {a.name}
                    </p>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200 overflow-hidden border border-[color:var(--ink)]/40">
                      <div
                        style={{
                          width: `${Math.round(a.conviction * 100)}%`,
                          height: "100%",
                          background:
                            a.conviction < 0.35 ? "var(--marker-red)" :
                            a.conviction < 0.65 ? "var(--marker-amber)" :
                            "var(--marker-green)",
                          transition: "width 700ms ease, background 500ms ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PhaseStepper({ phase }: { phase: B2BPhase | "done" | undefined }) {
  const currentIdx = phase && phase !== "done" ? PHASE_ORDER.indexOf(phase) : PHASE_ORDER.length;
  return (
    <div className="flex items-center gap-3">
      {PHASE_ORDER.map((p, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx && phase !== "done";
        return (
          <div key={p} className="flex items-center gap-2">
            <span
              className="handwritten px-3 py-1 border-[1.5px]"
              style={{
                borderColor: "var(--ink)",
                borderRadius: 999,
                background: current ? "var(--marker-teal)" : done ? "#ECFDF5" : "var(--paper)",
                color: "var(--ink)",
                fontSize: "1.05rem",
                transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(1deg)",
              }}
            >
              {i + 1}. {PHASE_LABELS[p]}
            </span>
            {i < PHASE_ORDER.length - 1 && <span style={{ color: "var(--ink)" }}>→</span>}
          </div>
        );
      })}
    </div>
  );
}

function StepBadge({ step }: { step: Step }) {
  const map: Record<Step, { label: string; color: string }> = {
    predict: { label: "Predict", color: "var(--marker-violet)" },
    act: { label: "Act", color: "var(--marker-teal)" },
    reveal: { label: "Reveal", color: "var(--marker-amber)" },
  };
  const { label, color } = map[step];
  return (
    <span
      className="handwritten px-2 py-0.5 border-[1.5px]"
      style={{ borderColor: color, color, borderRadius: 999, fontSize: "1rem", transform: "rotate(-1deg)" }}
    >
      {label}
    </span>
  );
}

function DoneCard({ state, onRestart }: { state: B2BState; onRestart: () => void }) {
  const avg = Math.round((state.agents.reduce((s, a) => s + a.conviction, 0) / state.agents.length) * 100);
  return (
    <div className="sketch-card-soft paper-bg mt-4" style={{ borderColor: "var(--marker-green)" }}>
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6" style={{ color: "var(--marker-amber)" }} />
        <h2 className="handwritten" style={{ fontSize: "1.8rem", color: "var(--ink)" }}>
          Simulation terminée
        </h2>
      </div>
      <p className="mt-2" style={{ color: "var(--ink)" }}>
        Conviction moyenne du comité&nbsp;: <strong>{avg}%</strong>
      </p>
      <div className="mt-4 flex justify-end">
        <button onClick={onRestart} className="sketch-btn sketch-btn-primary">
          <span style={{ color: "var(--ink)" }}>Rejouer</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}