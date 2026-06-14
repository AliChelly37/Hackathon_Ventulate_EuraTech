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

const Input = z.object({
  context: z.string().min(1),
  fields: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    hint: z.string().optional(),
  })).min(1).max(12),
});

/**
 * Generate short contextual placeholder suggestions for a batch of input fields,
 * given a product/context description. Returns { suggestions: { [key]: string } }.
 * If empty value is submitted, the caller uses the placeholder as the final answer.
 */
export const suggestFieldPlaceholders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const fieldList = data.fields
      .map((f) => `- ${f.key} — ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
      .join("\n");

    const prompt = `Tu génères des SUGGESTIONS de réponses (placeholders gris) pour des champs de formulaire d'un entrepreneur.

CONTEXTE PRODUIT FOURNI PAR L'UTILISATEUR :
"""${data.context}"""

CHAMPS À REMPLIR (clé — libellé) :
${fieldList}

RÈGLES :
- Une suggestion COURTE (≤ 25 mots), concrète, en français, COHÉRENTE avec le produit décrit.
- Cite des chiffres ou détails plausibles tirés du contexte (cible, prix, traction…).
- Pas de guillemets, pas de "Ex:", pas d'intro. Texte brut prêt à l'emploi.
- Chaque champ doit avoir UNE suggestion distincte et pertinente.

Retourne JSON strict : {"suggestions": {"<key>": "<texte>", ...}} avec EXACTEMENT les clés demandées.`;

    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const raw = extractJson(text) as { suggestions?: Record<string, unknown> };
      const out: Record<string, string> = {};
      for (const f of data.fields) {
        const v = raw?.suggestions?.[f.key];
        out[f.key] = typeof v === "string" ? v.trim() : "";
      }
      return { suggestions: out };
    } catch {
      const out: Record<string, string> = {};
      for (const f of data.fields) out[f.key] = "";
      return { suggestions: out };
    }
  });