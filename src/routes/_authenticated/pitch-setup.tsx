import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import {
  generateDemoDescription,
  getNextOnboardingQuestion,
} from "@/lib/pitch-onboard.functions";
import { Loader2, ArrowRight, Check, NotebookPen, SkipForward } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pitch-setup")({
  component: PitchSetupPage,
});

type QA = { question: string; answer: string; placeholder: string };

function PitchSetupPage() {
  const navigate = useNavigate();
  const genDemo = useServerFn(generateDemoDescription);
  const nextQ = useServerFn(getNextOnboardingQuestion);

  const [demo, setDemo] = useState("");
  const [description, setDescription] = useState("");
  const [demoLoading, setDemoLoading] = useState(true);
  const [confirmedDesc, setConfirmedDesc] = useState(false);

  const [qas, setQas] = useState<QA[]>([]);
  const [current, setCurrent] = useState<{ question: string; placeholder: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [finished, setFinished] = useState(false);
  const fetchedFirst = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { description: d } = await genDemo({});
        setDemo(d);
      } catch {
        setDemo("Ex : décrivez ici votre produit, vos clients et un chiffre clé…");
      } finally {
        setDemoLoading(false);
      }
    })();
  }, [genDemo]);

  async function handleConfirmDescription() {
    const text = (description || demo).trim();
    if (!text) { toast.error("Décris ton produit en quelques lignes."); return; }
    setDescription(text);
    setConfirmedDesc(true);
    if (fetchedFirst.current) return;
    fetchedFirst.current = true;
    setThinking(true);
    try {
      const r = await nextQ({ data: { description: text, qa: [] } });
      if (r.done) finalize(text, []);
      else setCurrent({ question: r.question, placeholder: r.placeholder });
    } catch {
      toast.error("L'IA n'a pas répondu, on continue.");
      finalize(text, []);
    } finally {
      setThinking(false);
    }
  }

  async function handleAnswer() {
    if (!current) return;
    // Rule: if the user submits empty, the AI placeholder becomes the official answer.
    const finalAnswer = (draft.trim() || current.placeholder.trim());
    if (!finalAnswer) return;
    const updated: QA[] = [...qas, { question: current.question, answer: finalAnswer, placeholder: current.placeholder }];
    setQas(updated);
    setDraft("");
    setCurrent(null);
    if (updated.length >= 3) { finalize(description, updated); return; }
    setThinking(true);
    try {
      const r = await nextQ({
        data: {
          description,
          qa: updated.map((x) => ({ question: x.question, answer: x.answer })),
        },
      });
      if (r.done) finalize(description, updated);
      else setCurrent({ question: r.question, placeholder: r.placeholder });
    } catch {
      finalize(description, updated);
    } finally {
      setThinking(false);
    }
  }

  function finalize(desc: string, list: QA[]) {
    const merged = {
      product: desc,
      value_proposition: desc,
      target_customer: list.find((x) => /cible|client/i.test(x.question))?.answer ?? "",
      price: list.find((x) => /prix|tarif|modèle/i.test(x.question))?.answer ?? "",
      expected_objection: list.find((x) => /objection|frein/i.test(x.question))?.answer ?? "",
      goal: list.find((x) => /objectif|but/i.test(x.question))?.answer ?? "",
      batna: list.find((x) => /batna|rupture/i.test(x.question))?.answer ?? "",
      onboarding_qa: list,
    };
    sessionStorage.setItem("intake_answers", JSON.stringify(merged));
    setFinished(true);
    setTimeout(() => navigate({ to: "/skills" }), 900);
  }

  return (
    <AppShell>
      <div className="nego-bg max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <NotebookPen className="h-5 w-5" style={{ color: "var(--marker-teal)" }} />
          <span className="font-hand text-2xl">Carnet de bord</span>
        </div>

        {/* Description card */}
        <section
          className="sketch-card-soft paper-bg page-fade"
          style={{ borderColor: "#2D2D2D" }}
        >
          <h1 className="font-hand text-4xl font-bold leading-tight">
            Décrivez votre produit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Écrivez librement. L'IA s'occupera de combler les trous.
          </p>

          <div className="mt-4 relative">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={demoLoading ? "L'IA prépare un exemple…" : demo}
              className="min-h-44 rounded-2xl bg-transparent border-[1.5px] text-base placeholder:text-gray-400 font-sans"
              style={{ borderColor: "#2D2D2D" }}
              disabled={confirmedDesc}
              autoFocus
            />
            {demoLoading && (
              <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {!confirmedDesc && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleConfirmDescription}
                disabled={demoLoading}
                className="sketch-btn sketch-btn-primary disabled:opacity-50"
              >
                Valider et continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Answered Q&A */}
        {qas.map((qa, i) => (
          <section
            key={i}
            className="sketch-card-soft paper-bg mt-5 page-fade"
            style={{ borderColor: "#2D2D2D" }}
          >
            <p className="font-hand text-2xl">{qa.question}</p>
            <p className="mt-2 text-base">{qa.answer}</p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--marker-green)]">
              <Check className="h-3.5 w-3.5" /> noté
            </div>
          </section>
        ))}

        {/* Current question */}
        {confirmedDesc && current && !finished && (
          <section
            className="sketch-card-soft paper-bg mt-5 page-fade"
            style={{ borderColor: "#2D2D2D" }}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Question {qas.length + 1} / 3
            </p>
            <p className="mt-1 font-hand text-3xl font-bold leading-tight">
              {current.question}
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={current.placeholder}
              className="mt-3 min-h-28 rounded-2xl bg-transparent border-[1.5px] text-base placeholder:text-gray-400"
              style={{ borderColor: "#2D2D2D" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAnswer();
              }}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAnswer}
                className="sketch-btn sketch-btn-primary"
              >
                {qas.length + 1 >= 3 ? "Terminer" : "Continuer"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* Thinking */}
        {thinking && (
          <div className="mt-5 flex items-center gap-2 text-muted-foreground font-hand text-xl">
            <Loader2 className="h-4 w-4 animate-spin" />
            L'IA réfléchit à la prochaine question…
          </div>
        )}

        {confirmedDesc && !finished && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => finalize(description, qas)}
              className="sketch-btn"
              style={{
                background: "var(--paper)",
                borderColor: "var(--ink)",
                padding: "0.5rem 1rem",
              }}
              aria-label="Passer les questions de relance"
            >
              <SkipForward size={14} />
              <span className="handwritten" style={{ color: "var(--ink)", fontSize: "1.1rem" }}>
                Passer les questions
              </span>
            </button>
          </div>
        )}

        {finished && (
          <div className="mt-5 sketch-card-soft paper-bg page-fade" style={{ borderColor: "var(--marker-green)" }}>
            <p className="font-hand text-2xl">Fiche complétée — direction l'atelier.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}