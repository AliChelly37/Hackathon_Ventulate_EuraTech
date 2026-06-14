import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

export type B2BPhase = "decouverte" | "pricing" | "closing";
export type B2BAgent = { id: string; role: string; name: string; conviction: number };
export type B2BOption = { label: string; tone: "value" | "discount" | "neutral"; expected_tip: string };
export type B2BReveal = {
  committee_reaction: string;
  conviction_delta: Record<string, number>;
  marker_annotation: string;
  good_move: boolean;
};
export type B2BPhaseState = {
  prediction?: number;
  options?: B2BOption[];
  choice_index?: number;
  reveal?: B2BReveal;
};
export type B2BState = {
  product: string;
  price_per_seat: string;
  seats: string;
  agents: B2BAgent[];
  current_phase: B2BPhase | "done";
  phases: Record<B2BPhase, B2BPhaseState>;
};

const PHASE_ORDER: B2BPhase[] = ["decouverte", "pricing", "closing"];

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("invalid json");
  }
}

function defaultAgents(): B2BAgent[] {
  return [
    { id: "cfo", role: "CFO", name: "Hélène — CFO", conviction: 0.35 },
    { id: "coo", role: "COO", name: "Marc — COO", conviction: 0.5 },
    { id: "lead", role: "Utilisatrice clé", name: "Sarah — Lead utilisatrice", conviction: 0.55 },
  ];
}

/* -------- Setup demo placeholders -------- */

export const generateB2BSetupDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const prompt = `Génère un produit SaaS B2B fictif pour une démo de simulateur de vente.
Retourne JSON strict :
{"product":"<une phrase, 8-14 mots, type 'Plateforme XYZ pour ...'>","price_per_seat":"<ex: 49 €>","seats":"<ex: 25>"}`;
    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const j = extractJson(text) as Partial<{ product: string; price_per_seat: string; seats: string }>;
      return {
        product: j.product ?? "Plateforme RevOps pour équipes commerciales B2B",
        price_per_seat: j.price_per_seat ?? "59 €",
        seats: j.seats ?? "20",
      };
    } catch {
      return {
        product: "Plateforme RevOps pour équipes commerciales B2B",
        price_per_seat: "59 €",
        seats: "20",
      };
    }
  });

/* -------- Create session -------- */

const CreateInput = z.object({
  product: z.string().min(2),
  price_per_seat: z.string().min(1),
  seats: z.string().min(1),
});

export const createB2BSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const state: B2BState = {
      product: data.product,
      price_per_seat: data.price_per_seat,
      seats: data.seats,
      agents: defaultAgents(),
      current_phase: "decouverte",
      phases: { decouverte: {}, pricing: {}, closing: {} },
    };
    const { data: row, error } = await context.supabase
      .from("sessions")
      .insert({
        user_id: context.userId,
        profile_type: "commercial",
        skill: "b2b",
        game_mode: "libre",
        status: "playing",
        product_context: { product: data.product, price_per_seat: data.price_per_seat, seats: data.seats },
        b2b_state: state as never,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "create failed");
    return { session_id: row.id as string, state };
  });

/* -------- Get session -------- */

export const getB2BSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sessions")
      .select("id,b2b_state,product_context,user_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "not found");
    return { session_id: row.id as string, state: row.b2b_state as unknown as B2BState };
  });

/* -------- Generate 3 options for the current phase -------- */

export const generateB2BOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), phase: z.enum(["decouverte", "pricing", "closing"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sessions")
      .select("b2b_state")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "not found");
    const state = row.b2b_state as unknown as B2BState;

    const phaseGoals: Record<B2BPhase, string> = {
      decouverte: "Phase Découverte : cadrer les enjeux du comité d'achat sans dévoiler le prix.",
      pricing: "Phase Pricing : justifier le prix face à une demande implicite de remise.",
      closing: "Phase Closing : engager une décision signée sans céder de valeur.",
    };

    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const prompt = `Tu es coach de vente B2B value-selling. Génère exactement 3 répliques que le commercial peut dire au comité d'achat lors d'un appel.
CONTEXTE :
- Produit : ${state.product}
- Prix/siège : ${state.price_per_seat} · Sièges : ${state.seats}
- ${phaseGoals[data.phase]}

Les 3 répliques doivent couvrir 3 stratégies différentes :
1. "value" — défendre la valeur (la bonne stratégie)
2. "discount" — brader le prix / céder une remise (mauvaise stratégie)
3. "neutral" — réponse neutre/exploratoire (correcte mais molle)

Chaque réplique fait 1 à 2 phrases, en français, ton commercial direct (vouvoiement).
Retourne JSON strict :
{"options":[{"label":"...","tone":"value","expected_tip":"..."},{"label":"...","tone":"discount","expected_tip":"..."},{"label":"...","tone":"neutral","expected_tip":"..."}]}
expected_tip = un mot-clé court (ex: "Value selling", "Discount trap", "Discovery deepening").`;

    try {
      const { text } = await generateText({ model: gateway(MODEL), prompt });
      const raw = extractJson(text) as { options?: B2BOption[] };
      const options = (raw.options ?? []).slice(0, 3) as B2BOption[];
      if (options.length !== 3) throw new Error("bad options");
      // persist options
      const next = { ...state, phases: { ...state.phases, [data.phase]: { ...state.phases[data.phase], options } } };
      await context.supabase.from("sessions").update({ b2b_state: next as never }).eq("id", data.id);
      return { options };
    } catch {
      const fallback: B2BOption[] = [
        { label: "Reprenons ensemble votre ROI cible : si nous prouvons un gain de 20% par siège dès le 1er trimestre, qu'est-ce qui vous bloquerait ?", tone: "value", expected_tip: "Value selling" },
        { label: "Pour vous faciliter la décision, je peux descendre à -25% dès aujourd'hui.", tone: "discount", expected_tip: "Discount trap" },
        { label: "Quels seraient vos critères de décision principaux pour ce trimestre ?", tone: "neutral", expected_tip: "Discovery deepening" },
      ];
      const next = { ...state, phases: { ...state.phases, [data.phase]: { ...state.phases[data.phase], options: fallback } } };
      await context.supabase.from("sessions").update({ b2b_state: next as never }).eq("id", data.id);
      return { options: fallback };
    }
  });

/* -------- Submit Predict + Act, get Reveal -------- */

const SubmitInput = z.object({
  id: z.string().uuid(),
  phase: z.enum(["decouverte", "pricing", "closing"]),
  prediction: z.number().min(0).max(100),
  choice_index: z.number().int().min(0).max(2),
});

function nextPhase(p: B2BPhase): B2BPhase | "done" {
  const i = PHASE_ORDER.indexOf(p);
  return i < 0 || i >= PHASE_ORDER.length - 1 ? "done" : PHASE_ORDER[i + 1];
}

export const submitB2BPhase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sessions")
      .select("b2b_state")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "not found");
    const state = row.b2b_state as unknown as B2BState;
    const phaseState = state.phases[data.phase];
    const chosen = phaseState?.options?.[data.choice_index];
    if (!chosen) throw new Error("option introuvable");

    // Deterministic conviction shift by tone
    const baseDelta = chosen.tone === "value" ? 0.18 : chosen.tone === "discount" ? -0.12 : 0.05;
    const jitter = (id: string) => ((id.charCodeAt(0) + state.agents.length) % 5) / 100;
    const conviction_delta: Record<string, number> = {};
    const agents = state.agents.map((a) => {
      const d =
        a.role === "CFO" && chosen.tone === "discount"
          ? -0.02
          : a.role === "CFO" && chosen.tone === "value"
          ? baseDelta + 0.04
          : baseDelta + jitter(a.id);
      conviction_delta[a.id] = Number(d.toFixed(3));
      return { ...a, conviction: Math.max(0, Math.min(1, a.conviction + d)) };
    });

    const tipByTone: Record<B2BOption["tone"], string> = {
      value: "Value selling — vous ancrez la décision sur le ROI, pas sur le prix.",
      discount: "Discount trap — la remise précoce détruit votre ancrage de valeur.",
      neutral: "Discovery — utile, mais ne fait pas avancer la décision.",
    };
    const reactionByTone: Record<B2BOption["tone"], string> = {
      value: "Le comité hoche la tête. Le CFO sort son carnet.",
      discount: "Le COO sourit, le CFO note la remise pour la généraliser.",
      neutral: "Le comité écoute poliment, peu d'engagement visible.",
    };

    const reveal: B2BReveal = {
      committee_reaction: reactionByTone[chosen.tone],
      conviction_delta,
      marker_annotation: `${chosen.expected_tip} — ${tipByTone[chosen.tone]}`,
      good_move: chosen.tone === "value",
    };

    const next: B2BState = {
      ...state,
      agents,
      phases: {
        ...state.phases,
        [data.phase]: {
          ...phaseState,
          prediction: data.prediction,
          choice_index: data.choice_index,
          reveal,
        },
      },
      current_phase: nextPhase(data.phase),
    };

    const { error: upErr } = await context.supabase
      .from("sessions")
      .update({
        b2b_state: next as never,
        status: next.current_phase === "done" ? "won" : "playing",
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    return { reveal, state: next };
  });