import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import {
  CONVICTION_CONFIG,
  computeConviction,
  type AgentState,
} from "./conviction";

const ProductContextSchema = z.object({
  product: z.string(),
  target_customer: z.string(),
  price: z.string(),
  value_proposition: z.string(),
  expected_objection: z.string(),
  goal: z.string(),
  batna: z.string(),
});
export type ProductContext = z.infer<typeof ProductContextSchema>;

const CreateSessionInput = z.object({
  game_mode: z.enum(["chrono", "libre"]),
  product_context: ProductContextSchema,
});

const CastAgentSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  priorities: z.string().min(1),
  weight: z.coerce.number(),
  starting_conviction: z.coerce.number(),
});

const CastSchema = z.object({
  agents: z.array(CastAgentSchema).min(3).max(5),
});
type Cast = z.infer<typeof CastSchema>;

function normalizeWeights<T extends { weight: number }>(arr: T[]): T[] {
  const total = arr.reduce((s, a) => s + a.weight, 0) || 1;
  return arr.map((a) => ({ ...a, weight: a.weight / total }));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Le modèle n'a pas renvoyé de JSON valide");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = record[key];
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function fallbackCast(ctx: ProductContext): Cast {
  return {
    agents: [
      {
        name: "Claire Moreau",
        role: "Directrice des achats",
        priorities: `Sécuriser le budget et obtenir des garanties solides avant d'acheter ${ctx.product}.`,
        weight: 0.38,
        starting_conviction: 0.26,
      },
      {
        name: "Marc Delattre",
        role: "Responsable financier",
        priorities: `Comprendre le retour sur investissement réel face au prix annoncé (${ctx.price}).`,
        weight: 0.27,
        starting_conviction: 0.22,
      },
      {
        name: "Nadia Benali",
        role: "Responsable opérations",
        priorities: `Limiter les risques de déploiement et vérifier que la solution sert bien ${ctx.target_customer}.`,
        weight: 0.2,
        starting_conviction: 0.31,
      },
      {
        name: "Thomas Rivière",
        role: "Utilisateur référent",
        priorities: `Être convaincu que la proposition de valeur est concrète au quotidien : ${ctx.value_proposition}.`,
        weight: 0.15,
        starting_conviction: 0.28,
      },
    ],
  };
}

function parseCast(raw: unknown, ctx: ProductContext): Cast {
  const record = asRecord(raw);
  const candidates = [
    raw,
    record.agents,
    record.interlocuteurs,
    record.participants,
    record.casting,
    record.cast,
    record.table,
    record.personas,
  ];
  const rawAgents = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!rawAgents) return fallbackCast(ctx);

  const agents = rawAgents
    .map((agent, index) => {
      const item = asRecord(agent);
      return CastAgentSchema.safeParse({
        name: pickString(item, ["name", "nom", "full_name", "prenom_nom"], `Interlocuteur ${index + 1}`),
        role: pickString(item, ["role", "fonction", "poste", "titre"], "Décideur"),
        priorities: pickString(item, ["priorities", "priorites", "priorités", "motivations", "objection"], ctx.expected_objection),
        weight: pickNumber(item, ["weight", "poids", "influence"], index === 0 ? 0.35 : 0.2),
        starting_conviction: pickNumber(item, ["starting_conviction", "conviction", "conviction_depart", "conviction_de_depart"], 0.25),
      });
    })
    .filter((result): result is z.SafeParseSuccess<z.infer<typeof CastAgentSchema>> => result.success)
    .map((result) => result.data)
    .slice(0, 5);

  const parsed = CastSchema.safeParse({ agents });
  return parsed.success ? parsed.data : fallbackCast(ctx);
}


export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey, MODEL_ID } =
      await import("./ai-gateway.server");

    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    // Generate the cast via structured output.
    const prompt = `Tu conçois une simulation de négociation pour un entrepreneur. Voici le contexte produit :

Produit : ${data.product_context.product}
Cible : ${data.product_context.target_customer}
Prix : ${data.product_context.price}
Proposition de valeur : ${data.product_context.value_proposition}
Objection attendue : ${data.product_context.expected_objection}
Objectif de l'utilisateur : ${data.product_context.goal}
BATNA : ${data.product_context.batna}

Construis une table de 3 à 5 interlocuteurs (clients et/ou fournisseurs) réalistes pour ce produit. Chaque interlocuteur a :
- un nom français crédible (prénom + nom)
- un rôle précis (ex: « Directrice des achats », « Responsable financier », « Responsable opérations », « Client grand compte », « Acheteur junior »)
- des priorités cachées (1 phrase, en français, ce qui le motive et son objection principale)
- un poids d'influence (weight) entre 0 et 1
- une conviction de départ entre 0.15 et 0.40 (ils sont sceptiques)

Contraintes IMPORTANTES :
- La somme des poids doit être proche de 1.
- Au moins un interlocuteur doit avoir un poids >= 0.30 (un décideur clé).
- Le casting doit forcer l'utilisateur à construire une coalition.

Retourne UNIQUEMENT le JSON structuré.`;

    let cast = fallbackCast(data.product_context);
    try {
      const { text: castText } = await generateText({
        model: gateway(MODEL_ID),
        prompt: `${prompt}

Format exact attendu : {"agents":[{"name":"...","role":"...","priorities":"...","weight":0.35,"starting_conviction":0.25}]}`,
      });
      cast = parseCast(extractJson(castText), data.product_context);
    } catch {
      cast = fallbackCast(data.product_context);
    }

    const normalized = normalizeWeights(cast.agents).map((a) => ({
      ...a,
      starting_conviction: clamp(
        a.starting_conviction,
        CONVICTION_CONFIG.STARTING_CONVICTION_MIN,
        CONVICTION_CONFIG.STARTING_CONVICTION_MAX,
      ),
    }));

    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        game_mode: data.game_mode,
        turn_limit: CONVICTION_CONFIG.DEFAULT_TURN_LIMIT,
        status: "playing",
        product_context: data.product_context,
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error(sErr?.message ?? "Session insert failed");

    const agentRows = normalized.map((a, i) => ({
      session_id: session.id,
      name: a.name,
      role: a.role,
      priorities: a.priorities,
      weight: a.weight,
      conviction: a.starting_conviction,
      order_index: i,
    }));
    const { data: insertedAgents, error: aErr } = await supabase
      .from("agents")
      .insert(agentRows)
      .select("id, name, role, weight, conviction, order_index");
    if (aErr) throw new Error(aErr.message);

    // Initial system message
    await supabase.from("messages").insert({
      session_id: session.id,
      sender: "system",
      content:
        "La table est réunie. Les interlocuteurs sont réticents. À vous de les convaincre.",
      turn_index: 0,
    });

    // Initial turn snapshot
    const agentStates: AgentState[] = (insertedAgents ?? []).map((a) => ({
      id: a.id as string,
      weight: Number(a.weight),
      conviction: Number(a.conviction),
    }));
    const r = computeConviction(agentStates);
    await supabase.from("turns").insert({
      session_id: session.id,
      turn_index: 0,
      overall_t: r.T,
      snapshot: agentStates as unknown as never,
    });

    return { session_id: session.id };
  });

const SendMessageInput = z.object({
  session_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

const TurnReplySchema = z.object({
  agent_id: z.string(),
  addressed_to: z.string(), // "user" or another agent id
  chat_line: z.string().min(1),
  new_conviction: z.coerce.number(),
  rationale: z.string().min(1),
});

const TurnResponseSchema = z.object({
  replies: z.array(TurnReplySchema).min(1),
});
type TurnResponse = z.infer<typeof TurnResponseSchema>;

function fallbackTurnResponse(
  agents: Array<{ id: string; name: string; role: string; conviction: number | string | null }>,
  userMessage: string,
): TurnResponse {
  const selected = agents.slice(0, Math.min(3, Math.max(1, agents.length)));
  return {
    replies: selected.map((agent, index) => ({
      agent_id: agent.id,
      addressed_to: "user",
      chat_line:
        index === 0
          ? `Merci, c'est plus clair. Avant d'avancer, j'ai besoin de comprendre ce qui garantit concrètement le résultat annoncé.`
          : index === 1
            ? `Votre point est intéressant, mais il faut encore relier cette proposition à un impact mesurable pour notre organisation.`
            : `Je veux bien poursuivre, à condition que vous précisiez les risques, les délais et les efforts nécessaires côté client.`,
      new_conviction: clamp(Number(agent.conviction) + (userMessage.trim().endsWith("?") ? 0.01 : 0.03), 0, 1),
      rationale: "Réponse de secours générée lorsque le modèle ne respecte pas le format JSON attendu.",
    })),
  };
}

function parseTurnResponse(
  raw: unknown,
  agents: Array<{ id: string; name: string; role: string; conviction: number | string | null }>,
  userMessage: string,
): TurnResponse {
  const record = asRecord(raw);
  const candidates = [
    raw,
    record.replies,
    record.responses,
    record.reponses,
    record["réponses"],
    record.messages,
    record.interventions,
    record.agent_replies,
    record.turns,
  ];
  const rawReplies = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!rawReplies) return fallbackTurnResponse(agents, userMessage);

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const agentByName = new Map(agents.map((agent) => [agent.name.toLowerCase(), agent]));
  const replies = rawReplies
    .map((reply, index) => {
      const item = asRecord(reply);
      const explicitAgentId = pickString(item, ["agent_id", "agentId", "speaker_id", "interlocuteur_id", "id"], "");
      const agentName = pickString(item, ["agent", "name", "nom", "speaker", "interlocuteur"], "").toLowerCase();
      const agent = agentById.get(explicitAgentId) ?? agentByName.get(agentName) ?? agents[index % agents.length];
      const addressedTo = pickString(item, ["addressed_to", "addressedTo", "to", "destinataire"], "user");

      return TurnReplySchema.safeParse({
        agent_id: agent?.id ?? "",
        addressed_to: addressedTo === "user" || agentById.has(addressedTo) ? addressedTo : "user",
        chat_line: pickString(item, ["chat_line", "chatLine", "content", "message", "reply", "text", "ligne"], "J'ai besoin de précisions avant de me prononcer."),
        new_conviction: clamp(pickNumber(item, ["new_conviction", "newConviction", "conviction", "updated_conviction"], Number(agent?.conviction ?? 0.25) + 0.02), 0, 1),
        rationale: pickString(item, ["rationale", "raison", "justification", "analyse"], "La réponse reste prudente et demande des preuves supplémentaires."),
      });
    })
    .filter((result): result is z.SafeParseSuccess<z.infer<typeof TurnReplySchema>> => result.success)
    .map((result) => result.data);

  const parsed = TurnResponseSchema.safeParse({ replies });
  return parsed.success ? parsed.data : fallbackTurnResponse(agents, userMessage);
}

export const sendUserMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendMessageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey, MODEL_ID } =
      await import("./ai-gateway.server");

    // Load session, agents, recent messages.
    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", data.session_id)
      .single();
    if (sErr || !session) throw new Error("Session introuvable");
    if (session.status !== "playing") throw new Error("Session terminée");

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, role, priorities, weight, conviction, order_index")
      .eq("session_id", session.id)
      .order("order_index");
    if (!agents || agents.length === 0) throw new Error("Casting introuvable");

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("sender, agent_id, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(30);
    const transcript = (recentMessages ?? []).reverse();

    const turnIndex = (session.current_turn ?? 0) + 1;

    // Insert user message first
    await supabase.from("messages").insert({
      session_id: session.id,
      sender: "user",
      content: data.content,
      turn_index: turnIndex,
    });

    // Build the LLM prompt
    const agentList = agents
      .map(
        (a) =>
          `- id=${a.id} | ${a.name} (${a.role}) | poids=${Number(a.weight).toFixed(2)} | conviction=${Number(a.conviction).toFixed(2)} | priorités cachées: ${a.priorities}`,
      )
      .join("\n");

    const transcriptText = transcript
      .map((m) => {
        if (m.sender === "user") return `UTILISATEUR: ${m.content}`;
        if (m.sender === "system") return `SYSTÈME: ${m.content}`;
        const ag = agents.find((a) => a.id === m.agent_id);
        return `${ag?.name ?? "Agent"}: ${m.content}`;
      })
      .join("\n");

    const pc = session.product_context as ProductContext;

    const prompt = `Tu animes une négociation simulée en français. L'utilisateur défend son produit face à une table d'interlocuteurs.

Contexte produit :
- Produit : ${pc.product}
- Cible : ${pc.target_customer}
- Prix : ${pc.price}
- Proposition de valeur : ${pc.value_proposition}
- Objection attendue : ${pc.expected_objection}
- BATNA utilisateur : ${pc.batna}

Table (id, rôle, poids, conviction actuelle 0-1, priorités cachées) :
${agentList}

Transcription récente :
${transcriptText}

Dernier message utilisateur : « ${data.content} »

Règles :
1. Chaque agent doit répondre une fois maximum, en français, dans une seule courte réplique (1-3 phrases). Tous les agents ne sont pas obligés de parler ; n'inclus que ceux dont la prise de parole est crédible (généralement 2 à 4 agents).
2. Ajoute 1 ou 2 répliques de "cross-talk" où un agent s'adresse à un autre agent (addressed_to = id d'un autre agent). Sinon addressed_to = "user".
3. Mets à jour new_conviction (0 à 1) avec une variation réaliste : petite (~0.02-0.06) pour un argument générique, plus forte (~0.08-0.15) si l'argument répond directement aux priorités cachées de cet agent ou propose une vraie concession. Réticents par défaut. Ne fais PAS monter tout le monde en même temps.
4. rationale = 1 phrase expliquant POURQUOI la conviction change (caché de l'utilisateur, utilisé pour le rapport).
5. Ne révèle jamais les priorités cachées ni les chiffres de conviction dans chat_line.
6. Garde les personnalités distinctes et cohérentes avec leur rôle.
7. INTERDICTION ABSOLUE de poser des questions basiques déjà couvertes par le Contexte produit ci-dessus (produit, cible, prix, proposition de valeur, BATNA). Les agents connaissent déjà ces informations et doivent enchaîner sur des objections pointues, des chiffres précis, des cas concrets, des demandes de preuve ou des contre-propositions. Pas de "C'est quoi votre produit ?", "À qui ça s'adresse ?", "Combien ça coûte ?".

Retourne UNIQUEMENT le JSON structuré.`;

    let turn = fallbackTurnResponse(agents, data.content);
    try {
      const { text: turnText } = await generateText({
        model: gateway(MODEL_ID),
        prompt: `${prompt}

Format exact attendu : {"replies":[{"agent_id":"id exact","addressed_to":"user","chat_line":"...","new_conviction":0.31,"rationale":"..."}]}`,
      });
      turn = parseTurnResponse(extractJson(turnText), agents, data.content);
    } catch {
      turn = fallbackTurnResponse(agents, data.content);
    }

    // Validate + clamp replies, map to known agent ids
    const agentById = new Map(agents.map((a) => [a.id, a]));
    const validReplies = turn.replies.filter((r) => agentById.has(r.agent_id));

    // Update agent convictions
    const updates = validReplies.map((r) => ({
      id: r.agent_id,
      conviction: clamp(r.new_conviction, 0, 1),
    }));
    for (const u of updates) {
      await supabase
        .from("agents")
        .update({ conviction: u.conviction })
        .eq("id", u.id);
    }

    // Insert agent messages
    const messageRows = validReplies.map((r) => ({
      session_id: session.id,
      sender: r.agent_id,
      agent_id: r.agent_id,
      addressed_to: r.addressed_to,
      content: r.chat_line,
      turn_index: turnIndex,
    }));
    if (messageRows.length > 0) {
      await supabase.from("messages").insert(messageRows);
    }

    // Recompute snapshot using latest convictions
    const newAgentStates: AgentState[] = agents.map((a) => {
      const u = updates.find((x) => x.id === a.id);
      return {
        id: a.id,
        weight: Number(a.weight),
        conviction: u ? u.conviction : Number(a.conviction),
      };
    });
    const result = computeConviction(newAgentStates);

    await supabase.from("turns").insert({
      session_id: session.id,
      turn_index: turnIndex,
      overall_t: result.T,
      snapshot: {
        agents: newAgentStates,
        rationales: validReplies.map((r) => ({
          agent_id: r.agent_id,
          rationale: r.rationale,
        })),
      } as unknown as never,
    });

    // Evaluate win/lose
    let newStatus: "playing" | "won" | "lost" = "playing";
    if (result.T >= CONVICTION_CONFIG.WIN_THRESHOLD) {
      newStatus = "won";
    } else if (
      session.game_mode === "chrono" &&
      turnIndex >= session.turn_limit
    ) {
      newStatus = "lost";
    }

    await supabase
      .from("sessions")
      .update({ current_turn: turnIndex, status: newStatus })
      .eq("id", session.id);

    return {
      turn_index: turnIndex,
      overall_t: result.T,
      capped: result.capped,
      status: newStatus,
    };

    function gateway(model: string) {
      return createLovableAiGatewayProvider(getLovableApiKey())(model);
    }
  });

const GenerateReportInput = z.object({
  session_id: z.string().uuid(),
});

const ReportSchema = z.object({
  outcome_summary: z.string(),
  pivotal_moments: z
    .array(z.object({ turn: z.number(), description: z.string() }))
    .min(1)
    .max(6),
  positives: z.array(z.string()).min(1).max(6),
  negatives: z.array(z.string()).min(1).max(6),
  tips: z.array(z.string()).min(3).max(3),
});

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { createLovableAiGatewayProvider, getLovableApiKey, MODEL_ID } =
      await import("./ai-gateway.server");

    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", data.session_id)
      .single();
    if (!session) throw new Error("Session introuvable");
    if (session.status !== "won" && session.status !== "lost") {
      throw new Error("La session n'est pas encore terminée");
    }

    // Return existing report if present
    const { data: existing } = await supabase
      .from("reports")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle();
    if (existing) return existing;

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, role, weight, conviction")
      .eq("session_id", session.id);
    const { data: messages } = await supabase
      .from("messages")
      .select("sender, agent_id, content, turn_index")
      .eq("session_id", session.id)
      .order("created_at");
    const { data: turns } = await supabase
      .from("turns")
      .select("turn_index, overall_t, snapshot")
      .eq("session_id", session.id)
      .order("turn_index");

    const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));
    const transcript = (messages ?? [])
      .map((m) => {
        if (m.sender === "user") return `T${m.turn_index} UTILISATEUR: ${m.content}`;
        if (m.sender === "system") return `T${m.turn_index} SYSTÈME: ${m.content}`;
        const ag = agentMap.get(m.agent_id ?? "");
        return `T${m.turn_index} ${ag?.name ?? "Agent"}: ${m.content}`;
      })
      .join("\n");

    const finalT = turns && turns.length > 0 ? Number(turns[turns.length - 1].overall_t) : 0;
    const tCurve = (turns ?? [])
      .map((t) => `T${t.turn_index}=${(Number(t.overall_t) * 100).toFixed(0)}%`)
      .join(", ");

    const prompt = `Tu es un coach de négociation. Analyse cette session terminée et rédige un débrief (REX) en français.

Résultat : ${session.status === "won" ? "VICTOIRE" : "ÉCHEC"} — conviction finale ${(finalT * 100).toFixed(0)}%.
Courbe de conviction : ${tCurve}

Interlocuteurs (conviction finale) :
${(agents ?? []).map((a) => `- ${a.name} (${a.role}) poids=${Number(a.weight).toFixed(2)} → ${(Number(a.conviction) * 100).toFixed(0)}%`).join("\n")}

Transcription complète :
${transcript}

Rédige :
- outcome_summary : 2-3 phrases.
- pivotal_moments : 3 à 5 tournants (n° de tour + description courte).
- positives : 2 à 4 points forts concrets de l'utilisateur.
- negatives : 2 à 4 points à améliorer concrets.
- tips : exactement 3 conseils actionnables pour la prochaine session.

Reste concret, factuel, et bienveillant. Pas de généralités creuses.`;

    const gateway = createLovableAiGatewayProvider(getLovableApiKey());
    const fallbackReport: z.infer<typeof ReportSchema> = {
      outcome_summary:
        session.status === "won"
          ? `Vous avez convaincu le comité avec une conviction finale de ${(finalT * 100).toFixed(0)}%.`
          : `Le comité n'a pas été convaincu (conviction finale ${(finalT * 100).toFixed(0)}%). Plusieurs objections sont restées sans réponse claire.`,
      pivotal_moments: (turns ?? [])
        .slice(1)
        .map((t, i, arr) => {
          const prev = i === 0 ? 0 : Number(arr[i - 1].overall_t);
          const delta = Number(t.overall_t) - prev;
          return {
            turn: Number(t.turn_index),
            delta,
            description:
              delta > 0
                ? `Tour ${t.turn_index} : argument efficace (+${(delta * 100).toFixed(0)} pts).`
                : `Tour ${t.turn_index} : conviction en recul (${(delta * 100).toFixed(0)} pts).`,
          };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3)
        .map(({ turn, description }) => ({ turn, description })),
      positives: ["Vous avez maintenu la discussion jusqu'à la conclusion."],
      negatives: ["Certaines objections clés n'ont pas trouvé de réponse convaincante."],
      tips: [
        "Identifiez le décideur principal et adressez son objection en premier.",
        "Proposez une concession concrète (pilote, garantie, clause de sortie).",
        "Reformulez les priorités cachées avant d'argumenter.",
      ],
    };
    if (fallbackReport.pivotal_moments.length === 0) {
      fallbackReport.pivotal_moments = [
        { turn: 1, description: "Session trop courte pour identifier un tournant clair." },
      ];
    }
    let report = fallbackReport;
    try {
      const { text: reportText } = await generateText({
        model: gateway(MODEL_ID),
        prompt,
      });
      try {
        report = ReportSchema.parse(extractJson(reportText));
      } catch {
        report = fallbackReport;
      }
    } catch {
      report = fallbackReport;
    }

    const { data: inserted, error } = await supabase
      .from("reports")
      .upsert({
        session_id: session.id,
        outcome: session.status,
        final_t: finalT,
        positives: report.positives,
        negatives: report.negatives,
        tips: report.tips,
        timeline: [
          { kind: "summary", text: report.outcome_summary },
          ...report.pivotal_moments.map((p) => ({
            kind: "pivot",
            turn: p.turn,
            text: p.description,
          })),
        ],
      }, { onConflict: "session_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });