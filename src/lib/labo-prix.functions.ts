import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

export type LaboCounterpart = { id: string; label: string; weight: number };
export type LaboDemand = { text: string; cost: number };
export type LaboSetup = {
  product: string;
  client: string;
  enjeu: string;
};
export type LaboScene = {
  demand: LaboDemand;
  counterparts: LaboCounterpart[];
};

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("invalid json");
  }
}

/* -------- Setup placeholders (grey, AI-generated, become defaults) -------- */

export const generateLaboSetupDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const prompt = `Génère un mini-contexte de négociation B2B pour une démo de simulateur "Labo des Prix & Concessions".
Retourne JSON strict (français, concis) :
{"product":"<produit SaaS B2B, 8-12 mots>","client":"<type de client / secteur, 6-10 mots>","enjeu":"<exigence financière initiale du client, 8-14 mots>"}`;
    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const j = extractJson(text) as Partial<LaboSetup>;
      return {
        product: j.product ?? "Plateforme SaaS de gestion RH pour PME en croissance",
        client: j.client ?? "DRH d'un groupe industriel, 800 collaborateurs",
        enjeu: j.enjeu ?? "Réduire le coût annuel des licences RH de 25%",
      } as LaboSetup;
    } catch {
      return {
        product: "Plateforme SaaS de gestion RH pour PME en croissance",
        client: "DRH d'un groupe industriel, 800 collaborateurs",
        enjeu: "Réduire le coût annuel des licences RH de 25%",
      } as LaboSetup;
    }
  });

/* -------- Scene generation : demand + 5 counterparts -------- */

const SceneInput = z.object({
  product: z.string().min(2),
  client: z.string().min(2),
  enjeu: z.string().min(2),
});

export const generateLaboScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SceneInput.parse(d))
  .handler(async ({ data }) => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const prompt = `Tu es coach de vente B2B. Construis une scène de négociation "Labo des Prix".
CONTEXTE :
- Produit : ${data.product}
- Client : ${data.client}
- Enjeu / exigence initiale : ${data.enjeu}

1) Reformule la demande dure du client en UNE phrase brutale (ex: "-20% de remise immédiate sur toutes les licences"), avec un coût numérique "cost" entre 6 et 10 (poids de la concession).
2) Propose 5 contreparties (cartes que le commercial peut demander en échange), chacune avec un "weight" entre 1 et 6. Les contreparties doivent être 100% cohérentes avec le contexte (ex: pour un SaaS RH → "Engagement 24 mois", "Paiement comptant annuel", "Étude de cas publiable", "Site pilote sur 2 BU", "Volume minimum garanti").
Retourne JSON strict :
{"demand":{"text":"...","cost":<int>},"counterparts":[{"id":"c1","label":"...","weight":<int>},{"id":"c2",...},{"id":"c3",...},{"id":"c4",...},{"id":"c5",...}]}`;
    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const j = extractJson(text) as Partial<LaboScene>;
      if (j.demand && Array.isArray(j.counterparts) && j.counterparts.length >= 3) {
        const counterparts = j.counterparts.slice(0, 5).map((c, i) => ({
          id: c.id ?? `c${i + 1}`,
          label: String(c.label ?? "Contrepartie"),
          weight: Math.max(1, Math.min(8, Number(c.weight) || 2)),
        }));
        return {
          demand: {
            text: String(j.demand.text ?? "-20% de remise"),
            cost: Math.max(3, Math.min(12, Number(j.demand.cost) || 7)),
          },
          counterparts,
        } as LaboScene;
      }
      throw new Error("bad scene");
    } catch {
      return {
        demand: { text: "-20% de remise immédiate sur l'ensemble des licences", cost: 8 },
        counterparts: [
          { id: "c1", label: "Engagement ferme 24 mois", weight: 4 },
          { id: "c2", label: "Paiement comptant annuel", weight: 3 },
          { id: "c3", label: "Étude de cas publiable", weight: 2 },
          { id: "c4", label: "Volume minimum garanti", weight: 3 },
          { id: "c5", label: "Site pilote sur 2 BU", weight: 2 },
        ],
      } as LaboScene;
    }
  });

/* -------- AI grey placeholders contextualised on previous fields -------- */

const PHInput = z.object({
  field: z.enum(["product", "client", "enjeu"]),
  context: z.object({
    product: z.string().optional(),
    client: z.string().optional(),
    enjeu: z.string().optional(),
  }),
});

export const generateLaboPlaceholder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PHInput.parse(d))
  .handler(async ({ data }) => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const fieldLabel: Record<typeof data.field, string> = {
      product: "Produit vendu",
      client: "Type de client en face",
      enjeu: "Exigence financière initiale du client",
    };
    const ctx = Object.entries(data.context)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `- ${k} : ${v}`)
      .join("\n");
    const prompt = `Génère UNE suggestion d'exemple (texte gris de placeholder) pour le champ "${fieldLabel[data.field]}" d'une fiche de négociation B2B.
CONTRAINTES :
- 1 phrase, 6-14 mots, français, ton concret.
- Doit être en cohérence LOGIQUE IMPLACABLE avec le contexte déjà saisi ci-dessous (ex : produit SaaS RH → enjeu lié aux licences RH).
- Pas de guillemets dans la sortie.
${ctx ? `CONTEXTE :\n${ctx}` : "(aucun contexte précédent)"}

Retourne JSON strict : {"suggestion":"..."}.`;
    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const j = extractJson(text) as { suggestion?: string };
      return { suggestion: (j.suggestion ?? "").trim() || fallback(data.field) };
    } catch {
      return { suggestion: fallback(data.field) };
    }
  });

function fallback(f: "product" | "client" | "enjeu"): string {
  return f === "product"
    ? "Plateforme SaaS de gestion RH pour PME en croissance"
    : f === "client"
    ? "DRH d'un groupe industriel, 800 collaborateurs"
    : "Réduire le coût annuel des licences RH de 25%";
}