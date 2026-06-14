import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const PITCH_MODEL = "google/gemini-3-pro-preview";
const PITCH_FAST_MODEL = "google/gemini-3-flash-preview";

export type InvestorPublic = {
  id: string;
  name: string;
  age: number | null;
  investor_type: string | null;
  fund_name: string | null;
  ticket_min: number | null;
  ticket_max: number | null;
  investment_thesis: string | null;
  portfolio_pattern: string | null;
  positive_traits: string | null;
  critical_traits: string | null;
  order_index: number | null;
};

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const PitchContextSchema = z.object({
  product: z.string(),
  pitch_stage: z.enum(["pre_seed", "seed", "series_a", "series_b"]),
  target_amount: z.coerce.number().positive(),
  target_valuation: z.coerce.number().positive().optional(),
  win_condition: z.enum(["term_sheet", "hard_yes", "lead_round", "high_interest"]),
  panel_size: z.coerce.number().int().min(3).max(6),
  expert_ratio: z.coerce.number().min(0).max(1), // % experts vs généralistes
  problem: z.string(),
  traction: z.string(),
  team: z.string(),
  ask: z.string(),
});
export type PitchContext = z.infer<typeof PitchContextSchema>;

const CreatePitchSessionInput = z.object({
  pitch_context: PitchContextSchema,
});

const InvestorAgentSchema = z.object({
  name: z.string(),
  age: z.coerce.number().int().min(28).max(72),
  investor_type: z.string(),
  fund_name: z.string(),
  ticket_min: z.coerce.number(),
  ticket_max: z.coerce.number(),
  investment_thesis: z.string(),
  portfolio_pattern: z.string(),
  positive_traits: z.string(),
  critical_traits: z.string(),
  // private
  thesis_fit_real: z.coerce.number().min(0).max(1),
  hidden_agenda: z.string(),
  secret_dealbreaker: z.string(),
  pattern_match_internal: z.string(),
});

const PanelSchema = z.object({
  investors: z.array(InvestorAgentSchema).min(3).max(6),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("Le modèle n'a pas renvoyé de JSON valide");
  }
}

function fallbackPanel(ctx: PitchContext): z.infer<typeof PanelSchema> {
  return {
    investors: [
      {
        name: "Sarah Cohen", age: 42, investor_type: "VC généraliste",
        fund_name: "Northbridge Ventures",
        ticket_min: 500_000, ticket_max: 3_000_000,
        investment_thesis: `Marketplaces B2B avec effets de réseau. Tickets ${ctx.pitch_stage}.`,
        portfolio_pattern: "12 deals, 3 exits, focus France/UK",
        positive_traits: "Méthodique, prend le temps d'analyser, respecte les fondateurs.",
        critical_traits: "Demande beaucoup de chiffres, peut paraître froide.",
        thesis_fit_real: 0.55, hidden_agenda: "Cherche un deal phare pour fonds 3.",
        secret_dealbreaker: "Equipe sans CTO technique.",
        pattern_match_internal: "Ressemble à un deal passé qui a foiré sur le scaling ops.",
      },
      {
        name: "Karim Belkacem", age: 38, investor_type: "Angel opérationnel",
        fund_name: "Solo angel — ex-COO @Stripe",
        ticket_min: 50_000, ticket_max: 200_000,
        investment_thesis: "Misent sur fondateurs techniques avec premiers signes de PMF.",
        portfolio_pattern: "Tickets rapides, suit la décision d'un lead.",
        positive_traits: "Bienveillant, donne plein d'intros, décide vite.",
        critical_traits: "Suiveur, n'ouvre pas un round.",
        thesis_fit_real: 0.7, hidden_agenda: "Veut signer si un VC reconnu lead.",
        secret_dealbreaker: "Founder qui sur-vend.",
        pattern_match_internal: "Profil similaire à 2 winners de son portfolio.",
      },
      {
        name: "Élodie Tran", age: 49, investor_type: "VC sectoriel",
        fund_name: "Vertex Climate",
        ticket_min: 1_000_000, ticket_max: 5_000_000,
        investment_thesis: "Climate tech avec métriques d'impact mesurables.",
        portfolio_pattern: "Très sélective, 4 deals/an.",
        positive_traits: "Expertise pointue, réseau corporate solide.",
        critical_traits: "Sceptique par défaut, pose des questions DD très techniques.",
        thesis_fit_real: 0.35, hidden_agenda: "Veut tester si l'équipe tient la pression.",
        secret_dealbreaker: "Pas de défensibilité tech.",
        pattern_match_internal: "Marché trop crowded selon sa cartographie interne.",
      },
    ].slice(0, ctx.panel_size),
  };
}

/* ------------------------------------------------------------------ */
/* createPitchSession                                                  */
/* ------------------------------------------------------------------ */

export const createPitchSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreatePitchSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const ctx = data.pitch_context;

    const nExperts = Math.round(ctx.panel_size * ctx.expert_ratio);
    const nGen = ctx.panel_size - nExperts;

    const prompt = `Tu construis un panel d'investisseurs réalistes pour un pitch ${ctx.pitch_stage}.
IMPORTANT : TOUS les textes générés (noms de fonds, thèses, traits, agendas, dealbreakers, patterns) doivent être rédigés EXCLUSIVEMENT EN FRANÇAIS. Pas un mot d'anglais sauf jargon tech intraduisible (SaaS, B2B, PMF, MoM, ARR).

CONTEXTE PROJET :
- Produit/marché : ${ctx.product}
- Problème : ${ctx.problem}
- Traction : ${ctx.traction}
- Équipe : ${ctx.team}
- Demande : ${ctx.ask}
- Objectif round : ${ctx.target_amount}€${ctx.target_valuation ? ` à valo ${ctx.target_valuation}€` : ""}
- Condition de victoire : ${ctx.win_condition}

COMPOSITION DEMANDÉE :
- ${ctx.panel_size} investisseurs au total
- ${nExperts} expert(s) sectoriel(s) du domaine
- ${nGen} généraliste(s) / opportuniste(s)
- Mix d'au moins 1 angel opérationnel et 1 VC institutionnel
- Profils crédibles (français + 1-2 internationaux possibles)

Pour CHAQUE investisseur, génère :
- name, age (28-72), investor_type, fund_name
- ticket_min, ticket_max (cohérents avec le stage)
- investment_thesis (1-2 phrases publiques)
- portfolio_pattern (1 phrase publique sur leur historique)
- positive_traits, critical_traits (1 phrase chacun, observable publiquement)
- thesis_fit_real : score 0-1 de vrai fit avec le projet (PRIVÉ)
- hidden_agenda : ce qu'ils cherchent vraiment (PRIVÉ)
- secret_dealbreaker : le red flag qui les ferait passer (PRIVÉ)
- pattern_match_internal : comparaison mentale interne (PRIVÉ)

Au moins 1 investisseur doit avoir thesis_fit_real > 0.6 (un lead potentiel).
Au moins 1 doit avoir thesis_fit_real < 0.35 (un sceptique).

Retourne UNIQUEMENT du JSON strict (tous les champs texte en français) :
{"investors":[{...},{...}]}`;

    let panel = fallbackPanel(ctx);
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-pro-preview"),
        prompt,
      });
      const parsed = PanelSchema.safeParse(extractJson(text));
      if (parsed.success) panel = parsed.data;
    } catch {
      panel = fallbackPanel(ctx);
    }

    // Insert session
    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        skill: "pitch",
        status: "playing",
        game_mode: "libre",
        product_context: ctx as unknown as never,
        pitch_stage: ctx.pitch_stage,
        win_condition: ctx.win_condition,
        target_amount: ctx.target_amount,
        target_valuation: ctx.target_valuation ?? null,
        phase: "free_pitch",
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error(sErr?.message ?? "Pitch session insert failed");

    const rows = panel.investors.slice(0, ctx.panel_size).map((inv, i) => ({
      session_id: session.id,
      name: inv.name,
      role: inv.investor_type,
      priorities: inv.investment_thesis,
      weight: 1 / ctx.panel_size,
      conviction: 0.25,
      order_index: i,
      age: inv.age,
      investor_type: inv.investor_type,
      fund_name: inv.fund_name,
      ticket_min: inv.ticket_min,
      ticket_max: inv.ticket_max,
      investment_thesis: inv.investment_thesis,
      portfolio_pattern: inv.portfolio_pattern,
      positive_traits: inv.positive_traits,
      critical_traits: inv.critical_traits,
      thesis_fit_real: String(inv.thesis_fit_real),
      hidden_agenda: inv.hidden_agenda,
      secret_dealbreaker: inv.secret_dealbreaker,
      pattern_match_internal: inv.pattern_match_internal,
    }));
    const { error: aErr } = await supabase.from("agents").insert(rows);
    if (aErr) throw new Error(aErr.message);

    return { session_id: session.id };
  });

/* ------------------------------------------------------------------ */
/* getPanel — public investor fields for /personas                     */
/* ------------------------------------------------------------------ */

const GetPanelInput = z.object({ session_id: z.string().uuid() });

export const getPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GetPanelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .select("id, skill, pitch_stage, win_condition, target_amount, target_valuation, phase")
      .eq("id", data.session_id)
      .single();
    if (sErr || !session) throw new Error("Session introuvable");

    const { data: agents, error: aErr } = await supabase
      .from("agents")
      .select(
        "id, name, age, investor_type, fund_name, ticket_min, ticket_max, " +
        "investment_thesis, portfolio_pattern, positive_traits, critical_traits, order_index"
      )
      .eq("session_id", data.session_id)
      .order("order_index", { ascending: true });
    if (aErr) throw new Error(aErr.message);

    return { session, investors: (agents ?? []) as unknown as InvestorPublic[] };
  });
/* ================================================================== */
/* Simulation: loaders + send + analyze + transition + debrief         */
/* ================================================================== */

export type SimMessage = {
  id: string;
  sender: string;
  agent_id: string | null;
  addressed_to: string | null;
  content: string;
  sender_type: string | null;
  created_at: string;
  turn_index: number;
};

export type SimSession = {
  id: string;
  skill: string | null;
  status: string | null;
  phase: string | null;
  pitch_stage: string | null;
  win_condition: string | null;
  target_amount: number | null;
  target_valuation: number | null;
  current_turn: number | null;
  free_pitch_content: string | null;
  product_context: string | null;
};

export type SimAgent = InvestorPublic & {
  conviction: number;
  has_left: boolean | null;
  commitment_status: string | null;
  proposed_valuation: number | null;
  proposed_ticket: number | null;
  is_lead_candidate: boolean | null;
};

const SessionIdInput = z.object({ session_id: z.string().uuid() });

/* ---- getSimulation ---- */

export const getSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SessionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const sid = data.session_id;

    const [{ data: session }, { data: agents }, { data: messages }] =
      await Promise.all([
        supabase.from("sessions").select("*").eq("id", sid).single(),
        supabase
          .from("agents")
          .select(
            "id, name, age, investor_type, fund_name, ticket_min, ticket_max," +
            " investment_thesis, portfolio_pattern, positive_traits, critical_traits," +
            " order_index, conviction, has_left, commitment_status," +
            " proposed_valuation, proposed_ticket, is_lead_candidate",
          )
          .eq("session_id", sid)
          .order("order_index", { ascending: true }),
        supabase
          .from("messages")
          .select("id, sender, agent_id, addressed_to, content, sender_type, created_at, turn_index")
          .eq("session_id", sid)
          .order("created_at", { ascending: true }),
      ]);

    if (!session) throw new Error("Session introuvable");

    const sessRow = session as Record<string, unknown>;
    return {
      session: {
        ...(sessRow as object),
        product_context: sessRow.product_context
          ? JSON.stringify(sessRow.product_context) : null,
      } as unknown as SimSession,
      agents: (agents ?? []) as unknown as SimAgent[],
      messages: (messages ?? []) as unknown as SimMessage[],
    };
  });

/* ---- analyzeFreePitch ---- */

const AnalyzeInput = z.object({
  session_id: z.string().uuid(),
  content: z.string().min(1),
});

const TOPICS = [
  "problem", "solution", "market", "traction",
  "team", "business_model", "competition", "ask",
] as const;

export const analyzeFreePitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const prompt = `Analyse ce pitch en cours et identifie quels sujets sont couverts.
Sujets possibles : ${TOPICS.join(", ")}.

PITCH :
"""${data.content}"""

Retourne JSON strict :
{"covered":["problem","solution",...],"missing_advice":"1 phrase de coach sur le sujet manquant le plus important"}`;

    try {
      const { text } = await generateText({
        model: gateway(PITCH_FAST_MODEL),
        prompt,
      });
      const raw = extractJson(text) as Record<string, unknown>;
      const covered = (Array.isArray(raw.covered) ? raw.covered : [])
        .filter((x): x is string => typeof x === "string" && (TOPICS as readonly string[]).includes(x));
      return {
        covered,
        missing_advice: typeof raw.missing_advice === "string" ? raw.missing_advice : "",
      };
    } catch {
      return { covered: [], missing_advice: "" };
    }
  });

/* ---- transitionToDiscussion ---- */

const TransitionInput = z.object({
  session_id: z.string().uuid(),
  free_pitch_content: z.string().min(1),
  duration_seconds: z.coerce.number().int().min(0).optional(),
});

export const transitionToDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TransitionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        phase: "discussion",
        free_pitch_content: data.free_pitch_content,
        free_pitch_duration_seconds: data.duration_seconds ?? null,
      } as never)
      .eq("id", data.session_id);
    if (updateError) throw new Error(updateError.message);

    // Save the free pitch as a message for the transcript
    const { error: messageError } = await supabase.from("messages").insert({
      session_id: data.session_id,
      sender: "user",
      sender_type: "free_pitch",
      content: data.free_pitch_content,
      turn_index: 0,
    } as never);
    if (messageError) throw new Error(messageError.message);

    return { ok: true };
  });

/* ---- sendMessagePitch ---- */

const SendPitchInput = z.object({
  session_id: z.string().uuid(),
  content: z.string().min(1).max(20000),
});

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export const sendMessagePitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendPitchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", data.session_id)
      .single();
    if (!session) throw new Error("Session introuvable");

    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .eq("session_id", data.session_id)
      .order("order_index");
    if (!agents) throw new Error("Panel introuvable");

    const activeAgents = (agents as Array<Record<string, unknown>>).filter((a) => !a.has_left);

    const { data: recent } = await supabase
      .from("messages")
      .select("sender, agent_id, content, sender_type")
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const transcript = (recent ?? []).reverse();

    const turnIndex = ((session as { current_turn?: number }).current_turn ?? 0) + 1;

    // Insert user message
    await supabase.from("messages").insert({
      session_id: data.session_id,
      sender: "user",
      sender_type: "discussion",
      content: data.content,
      turn_index: turnIndex,
    } as never);

    const ctx = (session as { product_context?: Record<string, unknown> }).product_context ?? {};
    const winCondition = (session as { win_condition?: string }).win_condition ?? "high_interest";
    const targetVal = (session as { target_valuation?: number | null }).target_valuation;
    const targetAmt = (session as { target_amount?: number | null }).target_amount;

    const panelDesc = activeAgents.map((a) =>
      `- id=${a.id} | ${a.name} (${a.investor_type ?? a.role}) | conviction=${Number(a.conviction).toFixed(2)} | thèse pub: ${a.investment_thesis ?? a.priorities} | agenda CACHÉ: ${a.hidden_agenda ?? "—"} | dealbreaker CACHÉ: ${a.secret_dealbreaker ?? "—"} | fit réel CACHÉ: ${a.thesis_fit_real ?? "—"}`
    ).join("\n");

    const transcriptText = transcript.map((m) => {
      if (m.sender === "user") return `FONDATEUR: ${m.content}`;
      const ag = activeAgents.find((a) => a.id === m.agent_id);
      return `${ag?.name ?? "Investisseur"}: ${m.content}`;
    }).join("\n");

    const prompt = `Tu animes une session de pitch investisseur EN FRANÇAIS. Le fondateur défend son projet face à un panel d'investisseurs.
IMPORTANT : toutes les chat_line doivent être rédigées EN FRANÇAIS naturel. Pas un mot d'anglais sauf jargon tech.

PROJET :
- Produit : ${(ctx as { product?: string }).product ?? "—"}
- Problème : ${(ctx as { problem?: string }).problem ?? "—"}
- Traction : ${(ctx as { traction?: string }).traction ?? "—"}
- Ask : ${(ctx as { ask?: string }).ask ?? "—"}
- Objectif : ${winCondition}${targetAmt ? ` | montant ${targetAmt}€` : ""}${targetVal ? ` | valo ${targetVal}€` : ""}

PANEL (avec infos PRIVÉES — ne JAMAIS les révéler dans chat_line) :
${panelDesc}

TRANSCRIPT RÉCENT :
${transcriptText}

DERNIER MESSAGE FONDATEUR : « ${data.content} »

RÈGLES :
1. Sélectionne 1-3 investisseurs qui prennent la parole (les plus pertinents, pas tous). Crédibilité avant tout.
2. Encourage le cross-talk : 1 investisseur peut interpeller un autre (addressed_to = id d'un autre).
3. Mets à jour new_conviction (0-1) :
   - Petite hausse (+0.02-0.05) pour argument générique
   - Hausse forte (+0.07-0.15) si répond à l'agenda caché ou aux priorités
   - Baisse (-0.05 à -0.20) si déclenche le secret_dealbreaker ou contradiction
4. Si un investisseur entre en DD profond : signal_type = "dd_question"
5. Si un investisseur fait une OFFRE chiffrée (term sheet, ticket), remplis proposed_valuation et proposed_ticket et signal_type = "offer"
6. commitment_status possible : "neutral", "warming", "soft_yes", "hard_yes", "leaving"
7. Reste BRÈF (2-3 phrases par investisseur, ton naturel d'humain)
8. Ne révèle jamais l'agenda caché ni les chiffres dans chat_line

Retourne UNIQUEMENT du JSON strict :
{
  "replies":[
    {
      "agent_id":"id exact",
      "addressed_to":"user OU id agent",
      "chat_line":"...",
      "new_conviction":0.42,
      "signal_type":"none|dd_question|offer|commitment_update",
      "proposed_valuation": null,
      "proposed_ticket": null,
      "commitment_status":"neutral|warming|soft_yes|hard_yes|leaving"
    }
  ]
}`;

    type Reply = {
      agent_id: string;
      addressed_to: string;
      chat_line: string;
      new_conviction: number;
      signal_type?: string;
      proposed_valuation?: number | null;
      proposed_ticket?: number | null;
      commitment_status?: string;
    };

    let replies: Reply[] = [];
    try {
      const { text } = await generateText({ model: gateway(PITCH_MODEL), prompt });
      const parsed = extractJson(text) as { replies?: unknown };
      if (Array.isArray(parsed.replies)) {
        replies = (parsed.replies as Reply[]).filter((r) =>
          activeAgents.some((a) => a.id === r.agent_id) &&
          typeof r.chat_line === "string" && r.chat_line.trim().length > 0
        );
      }
    } catch (e) {
      console.error("sendMessagePitch model error", e);
    }

    if (replies.length === 0) {
      replies = activeAgents.slice(0, 2).map((a) => ({
        agent_id: a.id as string,
        addressed_to: "user",
        chat_line: "Intéressant. Pouvez-vous nous en dire plus sur la défensibilité et la traction réelle ?",
        new_conviction: clamp(Number(a.conviction) + 0.02, 0, 1),
        signal_type: "dd_question",
      }));
    }

    // Apply updates
    for (const r of replies) {
      const updates: Record<string, unknown> = {
        conviction: clamp(Number(r.new_conviction), 0, 1),
      };
      if (r.commitment_status) updates.commitment_status = r.commitment_status;
      if (r.proposed_valuation != null) updates.proposed_valuation = Number(r.proposed_valuation);
      if (r.proposed_ticket != null) updates.proposed_ticket = Number(r.proposed_ticket);
      await supabase.from("agents").update(updates as never).eq("id", r.agent_id);
    }

    const messageRows = replies.map((r) => ({
      session_id: data.session_id,
      sender: r.agent_id,
      agent_id: r.agent_id,
      addressed_to: r.addressed_to,
      content: r.chat_line,
      sender_type: r.signal_type && r.signal_type !== "none" ? r.signal_type : "discussion",
      proposed_valuation: r.proposed_valuation ?? null,
      proposed_ticket: r.proposed_ticket ?? null,
      turn_index: turnIndex,
    }));
    if (messageRows.length > 0) {
      await supabase.from("messages").insert(messageRows as never);
    }

    await supabase.from("sessions").update({ current_turn: turnIndex } as never)
      .eq("id", data.session_id);

    return { ok: true, replies_count: replies.length };
  });

/* ---- generateDebrief ---- */

export const generateDebrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SessionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const { data: session } = await supabase
      .from("sessions").select("*").eq("id", data.session_id).single();
    const { data: agents } = await supabase
      .from("agents").select("*").eq("session_id", data.session_id).order("order_index");
    const { data: messages } = await supabase
      .from("messages").select("sender, agent_id, content")
      .eq("session_id", data.session_id).order("created_at");

    if (!session || !agents) throw new Error("Session introuvable");

    const transcript = (messages ?? []).map((m) => {
      if (m.sender === "user") return `FONDATEUR: ${m.content}`;
      const ag = (agents as Array<Record<string, unknown>>).find((a) => a.id === m.agent_id);
      return `${(ag?.name as string) ?? "Investisseur"}: ${m.content}`;
    }).join("\n");

    const panelDesc = (agents as Array<Record<string, unknown>>).map((a) =>
      `- id=${a.id} | ${a.name} (${a.investor_type}) | conviction finale=${Number(a.conviction).toFixed(2)} | fit réel=${a.thesis_fit_real} | agenda caché=${a.hidden_agenda} | dealbreaker=${a.secret_dealbreaker} | commitment=${a.commitment_status ?? "neutral"}`
    ).join("\n");

    const prompt = `Tu es l'animateur d'un débrief post-pitch EN FRANÇAIS. Génère les verdicts de CHAQUE investisseur de manière naturelle et honnête, et une synthèse globale.
IMPORTANT : toutes les "remark" et le "summary" doivent être rédigés EN FRANÇAIS. Pas un mot d'anglais sauf jargon tech.

PANEL (avec infos privées) — utilise EXACTEMENT les "id" ci-dessous comme agent_id dans ta réponse :
${panelDesc}

TRANSCRIPT COMPLET :
${transcript}

Pour CHAQUE investisseur, génère :
- verdict : "in" | "watching" | "out"
- remark : 2 phrases naturelles d'investisseur honnête sur ce qui a marché ou bloqué (peut révéler l'agenda caché ici, c'est le débrief)
- pitch_quality_score : 0-100
- relevance_score : 0-100 (pertinence pour le panel)

Puis une SYNTHÈSE :
- overall_verdict : "victory" | "draw" | "defeat"
- summary : 3 phrases sur la performance globale

Retourne JSON strict :
{
  "investors":[{"agent_id":"<id exact du panel>","verdict":"in","remark":"...","pitch_quality_score":78,"relevance_score":85}],
  "overall_verdict":"victory",
  "summary":"..."
}`;

    type Verdict = {
      agent_id: string; verdict: string; remark: string;
      pitch_quality_score: number; relevance_score: number;
    };
    let result: { investors: Verdict[]; overall_verdict: string; summary: string };
    try {
      const { text } = await generateText({ model: gateway(PITCH_MODEL), prompt });
      result = extractJson(text) as typeof result;
    } catch {
      result = {
        investors: (agents as Array<Record<string, unknown>>).map((a) => ({
          agent_id: a.id as string,
          verdict: Number(a.conviction) > 0.6 ? "in" : Number(a.conviction) > 0.35 ? "watching" : "out",
          remark: "Pitch suivi attentivement. Besoin de plus de visibilité sur la traction avant de me positionner.",
          pitch_quality_score: 60,
          relevance_score: 55,
        })),
        overall_verdict: "draw",
        summary: "Le panel reste attentif mais demande plus de preuves avant de s'engager.",
      };
    }

    // Map LLM verdicts back to real agent IDs (LLM sometimes invents/aliases IDs).
    const agentList = agents as Array<Record<string, unknown>>;
    const validIds = new Set(agentList.map((a) => a.id as string));
    const verdicts: Verdict[] = (result.investors ?? []).map((v, i) => ({
      ...v,
      agent_id: validIds.has(v.agent_id) ? v.agent_id : (agentList[i]?.id as string),
    })).filter((v) => !!v.agent_id);
    // Fallback : si rien n'a matché, génère un verdict déterministe pour chaque agent
    const finalVerdicts: Verdict[] = verdicts.length > 0 ? verdicts : agentList.map((a) => ({
      agent_id: a.id as string,
      verdict: Number(a.conviction) > 0.6 ? "in" : Number(a.conviction) > 0.35 ? "watching" : "out",
      remark: "Pitch suivi. Besoin de plus de visibilité sur la traction.",
      pitch_quality_score: 60,
      relevance_score: 55,
    }));

    // Persist verdicts on agents (real column names)
    for (const v of finalVerdicts) {
      const { error: agErr } = await supabase.from("agents").update({
        debrief_verdict: v.verdict,
        debrief_positive_remarks: v.remark,
        debrief_pitch_quality_score: v.pitch_quality_score,
        debrief_relevance_score: v.relevance_score,
      } as never).eq("id", v.agent_id);
      if (agErr) console.error("[debrief] agent update failed", agErr);
    }

    await supabase.from("sessions").update({
      phase: "debrief",
      status: result.overall_verdict === "victory" ? "won" : "lost",
    } as never).eq("id", data.session_id);

    // Insert debrief messages
    for (const v of finalVerdicts) {
      const { error: msgErr } = await supabase.from("messages").insert({
        session_id: data.session_id,
        sender: v.agent_id,
        agent_id: v.agent_id,
        content: v.remark,
        sender_type: `debrief_${v.verdict}`,
        turn_index: 999,
      } as never);
      if (msgErr) console.error("[debrief] message insert failed", msgErr);
    }

    return { ...result, investors: finalVerdicts };
  });

/* ---- generateReportPitch ---- */

export type PitchReport = {
  outcome: "victory" | "draw" | "defeat";
  score: number; // 0-100, adapted to win_condition
  win_condition: string;
  summary: string;
  positives: string[];
  negatives: string[];
  tips: string[];
  recommended_readings: string[];
  investors: Array<{
    agent_id: string;
    name: string;
    investor_type: string | null;
    verdict: string;
    remark: string;
    pitch_quality_score: number;
    relevance_score: number;
    conviction: number;
    commitment_status: string | null;
    proposed_valuation: number | null;
    proposed_ticket: number | null;
    is_lead_candidate: boolean | null;
    thesis_fit_real: number | null;
    hidden_agenda: string | null;
    secret_dealbreaker: string | null;
    pattern_match_internal: string | null;
  }>;
  timeline: Array<{ kind: string; turn?: number; text: string }>;
  radar: { clarity: number; traction: number; team: number; market: number; ask: number };
  lead_analysis: { has_lead: boolean; lead_name: string | null; reason: string };
  dd_summary: { questions_count: number; topics: string[] };
};

export const generateReportPitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SessionIdInput.parse(d))
  .handler(async ({ data, context }): Promise<PitchReport> => {
    const { supabase } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey } =
      await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const { data: session } = await supabase
      .from("sessions").select("*").eq("id", data.session_id).single();
    const { data: agents } = await supabase
      .from("agents").select("*").eq("session_id", data.session_id).order("order_index");
    const { data: messages } = await supabase
      .from("messages").select("sender, agent_id, content, sender_type, turn_index")
      .eq("session_id", data.session_id).order("created_at");

    if (!session || !agents) throw new Error("Session introuvable");
    const ags = agents as Array<Record<string, unknown>>;
    const msgs = (messages ?? []) as Array<Record<string, unknown>>;

    const winCondition = (session as Record<string, unknown>).win_condition as string ?? "high_interest";

    // Score : la NOTE reflète la QUALITÉ du pitch (jugée par les investisseurs via le LLM),
    // pas seulement l'issue commerciale. Un bon pitch sans deal doit rester noté correctement.
    const n = Math.max(1, ags.length);
    const inCount = ags.filter((a) => a.debrief_verdict === "in").length;
    const watchCount = ags.filter((a) => a.debrief_verdict === "watching").length;
    const outCount = ags.filter((a) => a.debrief_verdict === "out").length;
    const avgConv = ags.reduce((s, a) => s + Number(a.conviction ?? 0), 0) / n;
    const avgQuality = ags.reduce((s, a) => s + Number(a.debrief_pitch_quality_score ?? 0), 0) / n;
    const avgRelevance = ags.reduce((s, a) => s + Number(a.debrief_relevance_score ?? 0), 0) / n;
    const hasLead = ags.some((a) => a.is_lead_candidate);
    const hasTermSheet = ags.some((a) => a.proposed_valuation && a.proposed_ticket);

    // Score qualité (0-100) : 60% qualité LLM, 25% pertinence LLM, 15% verdicts.
    // Si les scores LLM sont absents (parse échoué), retombe sur conviction + verdicts.
    const verdictScore = ((inCount * 100) + (watchCount * 60) + (outCount * 25)) / n;
    const llmAvailable = avgQuality > 0 || avgRelevance > 0;
    let quality = llmAvailable
      ? avgQuality * 0.6 + avgRelevance * 0.25 + verdictScore * 0.15
      : avgConv * 70 + verdictScore * 0.3;

    // Bonus d'issue selon la condition de victoire (ne descend jamais la note d'un bon pitch).
    if (winCondition === "hard_yes" && inCount >= 3) quality += 10;
    else if (winCondition === "lead_round" && hasLead) quality += 10;
    else if (winCondition === "term_sheet" && hasTermSheet) quality += 12;
    else if (winCondition === "high_interest" && avgConv >= 0.7) quality += 8;

    // Plancher à 30 dès qu'un pitch a réellement eu lieu : un pitch livré n'est jamais "0".
    if (msgs.length > 0) quality = Math.max(30, quality);
    const score = Math.round(Math.min(100, Math.max(0, quality)));

    const transcript = msgs.map((m) => {
      if (m.sender === "user") return `FONDATEUR: ${m.content}`;
      const ag = ags.find((a) => a.id === m.agent_id);
      return `${(ag?.name as string) ?? "Investisseur"}: ${m.content}`;
    }).join("\n");

    const panelDesc = ags.map((a) =>
      `- ${a.name} (${a.investor_type}) verdict=${a.debrief_verdict ?? "?"} conviction=${Number(a.conviction).toFixed(2)} fit_réel=${a.thesis_fit_real} agenda=${a.hidden_agenda}`
    ).join("\n");

    const prompt = `Tu es l'analyste post-pitch. Génère un rapport stratégique pour le fondateur.
IMPORTANT : rédige TOUT le rapport EN FRANÇAIS (summary, positives, negatives, tips, readings, lead_analysis, dd_topics, timeline_highlights). Pas un mot d'anglais sauf jargon tech.

CONDITION DE VICTOIRE : ${winCondition}
SCORE CALCULÉ : ${score}/100

PANEL :
${panelDesc}

TRANSCRIPT :
${transcript.slice(0, 8000)}

Génère un JSON strict :
{
  "summary": "3 phrases sur la performance globale",
  "positives": ["3-5 points forts concrets observés"],
  "negatives": ["3-5 points faibles concrets observés"],
  "tips": ["3-5 conseils actionnables pour le prochain pitch"],
  "recommended_readings": ["2-3 ressources/livres pertinents"],
  "radar": {"clarity":0-100,"traction":0-100,"team":0-100,"market":0-100,"ask":0-100},
  "lead_analysis": {"reason":"pourquoi un lead a émergé ou pas"},
  "dd_topics": ["sujets de due diligence soulevés"],
  "timeline_highlights": [{"turn":3,"kind":"signal","text":"..."}]
}`;

    type LlmOut = {
      summary: string;
      positives: string[];
      negatives: string[];
      tips: string[];
      recommended_readings: string[];
      radar: { clarity: number; traction: number; team: number; market: number; ask: number };
      lead_analysis: { reason: string };
      dd_topics: string[];
      timeline_highlights: Array<{ turn?: number; kind: string; text: string }>;
    };

    let llm: LlmOut;
    try {
      const { text } = await generateText({ model: gateway(PITCH_MODEL), prompt });
      llm = extractJson(text) as LlmOut;
    } catch {
      llm = {
        summary: "Le panel a suivi le pitch mais attend des preuves supplémentaires avant de s'engager pleinement.",
        positives: ["Storytelling clair", "Équipe crédible", "Marché identifié"],
        negatives: ["Traction insuffisamment quantifiée", "Ask peu structuré"],
        tips: ["Préparer 3 metrics clés à dégainer", "Préciser l'usage des fonds", "Anticiper les objections DD"],
        recommended_readings: ["Pitch Anything — Oren Klaff", "Venture Deals — Brad Feld"],
        radar: { clarity: 65, traction: 50, team: 70, market: 60, ask: 55 },
        lead_analysis: { reason: "Aucun investisseur n'a pris le rôle de lead clairement." },
        dd_topics: ["Unit economics", "Roadmap produit"],
        timeline_highlights: [],
      };
    }

    const leadAgent = ags.find((a) => a.is_lead_candidate);
    const ddQuestions = msgs.filter((m) => (m.sender_type as string) === "dd_question");

    const outcome: "victory" | "draw" | "defeat" =
      score >= 70 ? "victory" : score >= 45 ? "draw" : "defeat";

    const report: PitchReport = {
      outcome,
      score,
      win_condition: winCondition,
      summary: llm.summary,
      positives: llm.positives,
      negatives: llm.negatives,
      tips: llm.tips,
      recommended_readings: llm.recommended_readings,
      investors: ags.map((a) => ({
        agent_id: a.id as string,
        name: a.name as string,
        investor_type: (a.investor_type as string) ?? null,
        verdict: (a.debrief_verdict as string) ?? "watching",
        remark: (a.debrief_positive_remarks as string) ?? (a.debrief_negative_remarks as string) ?? "",
        pitch_quality_score: Number(a.debrief_pitch_quality_score ?? 0),
        relevance_score: Number(a.debrief_relevance_score ?? 0),
        conviction: Number(a.conviction ?? 0),
        commitment_status: (a.commitment_status as string) ?? null,
        proposed_valuation: a.proposed_valuation as number ?? null,
        proposed_ticket: a.proposed_ticket as number ?? null,
        is_lead_candidate: a.is_lead_candidate as boolean ?? null,
        thesis_fit_real: a.thesis_fit_real as number ?? null,
        hidden_agenda: (a.hidden_agenda as string) ?? null,
        secret_dealbreaker: (a.secret_dealbreaker as string) ?? null,
        pattern_match_internal: (a.pattern_match_internal as string) ?? null,
      })),
      timeline: llm.timeline_highlights ?? [],
      radar: llm.radar,
      lead_analysis: {
        has_lead: Boolean(leadAgent),
        lead_name: (leadAgent?.name as string) ?? null,
        reason: llm.lead_analysis.reason,
      },
      dd_summary: {
        questions_count: ddQuestions.length,
        topics: llm.dd_topics ?? [],
      },
    };

    // Persist
    await supabase.from("reports").insert({
      session_id: data.session_id,
      outcome: report.outcome,
      final_t: avgConv,
      summary: report.summary,
      positives: report.positives as unknown as never,
      negatives: report.negatives as unknown as never,
      tips: report.tips as unknown as never,
      timeline: report.timeline as unknown as never,
    } as never);

    return report;
  });
