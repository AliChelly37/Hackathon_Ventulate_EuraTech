import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("invalid json");
  }
}

/* ---- Demo description (pre-filled gray placeholder) ---- */

export const generateDemoDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const prompt = `Génère UNE description fictive de startup (3-5 phrases, en français) pour un placeholder de démo.
Style : un fondateur qui décrit son produit naturellement, avec problème, solution, cible et un chiffre de traction.
Choisis un secteur au hasard (SaaS restau, marketplace artisans, app santé, fintech PME, etc.).
Retourne UNIQUEMENT le texte de description, sans guillemets, sans intro.`;
    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      return { description: text.trim() };
    } catch {
      return {
        description:
          "Ex : Nous développons un SaaS de gestion de planning pour les restaurateurs indépendants. Le problème : 70% perdent 5h/semaine sur Excel pour caler les plannings. Notre app le fait en 3 clics et synchronise les pointages. Cible : restaurants 5-30 salariés en France. Traction : 40 restaurants payants, 12k€ MRR, croissance 30%/mois.",
      };
    }
  });

/* ---- Next question (max 3, no duplicates with description) ---- */

const NextInput = z.object({
  description: z.string().min(1),
  qa: z.array(z.object({ question: z.string(), answer: z.string() })).max(3),
});

export const getNextOnboardingQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NextInput.parse(d))
  .handler(async ({ data }) => {
    if (data.qa.length >= 3) return { done: true as const };

    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const history = data.qa
      .map((x, i) => `Q${i + 1}: ${x.question}\nR${i + 1}: ${x.answer}`)
      .join("\n\n");

    const prompt = `Tu es un coach d'onboarding pour entrepreneurs. Tu vas poser une SEULE question pour compléter la fiche projet.

DESCRIPTION DÉJÀ FOURNIE PAR L'UTILISATEUR :
"""${data.description}"""

QUESTIONS DÉJÀ POSÉES :
${history || "(aucune)"}

RÈGLES STRICTES :
- INTERDIT de poser une question sur un sujet déjà couvert par la description ou les réponses précédentes.
- Maximum 3 questions au total. Tu en as déjà posé ${data.qa.length}.
- La question doit combler un MANQUE critique (ex: prix, BATNA, objection attendue, modèle éco, métrique manquante, cible précise…).
- Le placeholder doit être un exemple PRÉCIS et CONTEXTUEL généré à partir des infos déjà fournies (cite leur secteur/produit).
- Tout en français, court (≤ 20 mots pour la question, ≤ 25 mots pour le placeholder).

Retourne JSON strict :
{"question":"...","placeholder":"..."}`;

    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const raw = extractJson(text) as { question?: string; placeholder?: string };
      if (!raw.question) return { done: true as const };
      return {
        done: false as const,
        question: String(raw.question),
        placeholder: String(raw.placeholder ?? ""),
      };
    } catch {
      return { done: true as const };
    }
  });