import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Récupère le dernier contexte Pitch de l'utilisateur et le transforme en
 * product_context compatible avec la simulation de négociation.
 * Aucune modification de schéma : on lit uniquement `sessions.product_context`
 * (qui contient le PitchContext sérialisé) pour la session de pitch la plus
 * récente.
 */
export const getLatestPitchContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, skill, product_context, created_at, target_amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!sessions || sessions.length === 0) return null;

    // Préférer une session marquée "pitch"; sinon la plus récente avec un produit non vide.
    const pitch =
      sessions.find((s) => (s.skill ?? "").toLowerCase().includes("pitch")) ??
      sessions.find((s) => {
        const pc = (s.product_context ?? {}) as Record<string, unknown>;
        return typeof pc.product === "string" && (pc.product as string).trim().length > 0;
      });
    if (!pitch) return null;

    const pc = (pitch.product_context ?? {}) as Record<string, unknown>;
    const s = (k: string) => (typeof pc[k] === "string" ? (pc[k] as string) : "");

    const product = s("product");
    if (!product) return null;

    const problem = s("problem");
    const traction = s("traction");
    const team = s("team");
    const ask = s("ask") || s("goal");
    const target =
      pitch.target_amount != null
        ? `Levée visée : ${pitch.target_amount}`
        : s("price") || "Tarification à présenter au comité";

    return {
      source_session_id: pitch.id as string,
      product_context: {
        product,
        target_customer: s("target_customer") || "Comité hérité de la session Pitch",
        price: target,
        value_proposition:
          s("value_proposition") || problem || "Proposition de valeur issue du pitch.",
        expected_objection:
          s("expected_objection") ||
          "Doutes habituels investisseurs : marché, traction, équipe, défensibilité.",
        goal: ask || "Obtenir un engagement clair du comité.",
        batna: s("batna") || "Continuer en bootstrap et revenir avec plus de traction.",
      },
      pitch_summary: {
        product,
        problem,
        traction,
        team,
        ask,
      },
    };
  });