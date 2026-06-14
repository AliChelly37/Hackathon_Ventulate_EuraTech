import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiPlaceholders, resolveValue } from "@/hooks/useAiPlaceholders";

export const Route = createFileRoute("/_authenticated/intake")({ component: IntakePage });

interface Answers { product: string; target_customer: string; price: string; value_proposition: string; expected_objection: string; goal: string; batna: string; }
const QUESTIONS: { key: keyof Answers; q: string; placeholder: string }[] = [
  { key: "product", q: "Parlez-moi de votre produit ou service.", placeholder: "Une plateforme SaaS de gestion de planning pour…" },
  { key: "target_customer", q: "Qui est votre client cible ?", placeholder: "Les PME du secteur retail entre 20 et 200 salariés…" },
  { key: "price", q: "Quel est votre prix ou modèle tarifaire ?", placeholder: "Abonnement mensuel à 79 € par utilisateur…" },
  { key: "value_proposition", q: "Quelle est votre proposition de valeur principale ?", placeholder: "Diviser par 3 le temps de planification…" },
  { key: "expected_objection", q: "Quelle objection principale attendez-vous ?", placeholder: "On a déjà un outil interne…" },
  { key: "goal", q: "Quel est votre objectif dans cette négociation ?", placeholder: "Signer un pilote de 6 mois sur 50 utilisateurs…" },
  { key: "batna", q: "Quel est votre point de rupture (BATNA) ?", placeholder: "En dessous de 50 € par utilisateur, je passe mon tour…" },
];

function IntakePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [draft, setDraft] = useState("");
  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  // Build a context from the product description (first answer) for AI placeholders.
  const aiContext = (answers.product ?? "").trim();
  const remainingFields = useMemo(
    () => QUESTIONS.filter((q) => q.key !== "product").map((q) => ({ key: q.key, label: q.q })),
    [],
  );
  const { placeholders } = useAiPlaceholders(aiContext, remainingFields);

  // Fall back to AI placeholder if the field is empty, else the static example.
  const effectivePlaceholder = placeholders[current.key] || current.placeholder;

  function handleNext() {
    const finalValue = resolveValue(draft, effectivePlaceholder);
    if (!finalValue) return;
    const updated = { ...answers, [current.key]: finalValue };
    setAnswers(updated);
    setDraft("");
    if (isLast) {
      sessionStorage.setItem("intake_answers", JSON.stringify(updated));
      navigate({ to: "/setup" });
    } else setStep(step + 1);
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Question {step + 1} / {QUESTIONS.length}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xl font-medium">{current.q}</p>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={effectivePlaceholder} className="mt-4 min-h-32 rounded-2xl placeholder:text-gray-400" autoFocus />
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => { setStep(step - 1); setDraft(answers[QUESTIONS[step - 1].key] ?? ""); }}>Retour</Button>
            <Button onClick={handleNext} className="rounded-full">{isLast ? "Lancer la simulation" : "Continuer"}</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}