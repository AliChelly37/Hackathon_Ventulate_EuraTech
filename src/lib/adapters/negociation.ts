import type { ReactNode } from "react";

export interface DbAgent {
  id: string;
  name: string;
  role: string;
  weight: number;
  conviction: number;
  priorities?: string | null;
  order_index?: number;
  hidden_agenda?: string | null;
}

export interface DbMessage {
  id: string;
  sender: string;
  agent_id: string | null;
  addressed_to: string | null;
  content: string;
  created_at: string;
  sender_type?: string | null;
}

export type Tier = 1 | 2 | 3;
export type SenderType = "user" | "agent" | "system" | "coalition" | "whisper";

export interface UiAgent {
  id: string;
  name: string;
  role: string;
  weight: number;
  conviction: number;
  tier: Tier;
  positive_traits: string[];
  critical_traits: string[];
  initial_comment: string;
  has_left: boolean;
  hidden_agenda: string;
}

export interface UiMessage {
  id: string;
  sender_type: SenderType;
  agent_id: string | null;
  addressed_to: string | null;
  content: string;
  created_at: string;
}

function splitTraits(priorities: string | null | undefined): { pos: string[]; crit: string[] } {
  if (!priorities) return { pos: [], crit: [] };
  const parts = priorities
    .split(/[,;·•]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { pos: parts.slice(0, 2), crit: parts.slice(2, 4) };
}

export function deriveTier(weight: number): Tier {
  if (weight >= 0.4) return 3;
  if (weight >= 0.25) return 2;
  return 1;
}

export function tierMeta(tier: Tier): { label: string; color: string } {
  if (tier === 3) return { label: "Décideur", color: "var(--marker-red)" };
  if (tier === 2) return { label: "Influenceur", color: "var(--marker-amber)" };
  return { label: "Participant", color: "#6B7280" };
}

export function mapAgentsToUI(rows: DbAgent[]): UiAgent[] {
  return rows.map((a) => {
    const { pos, crit } = splitTraits(a.priorities);
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      weight: Number(a.weight),
      conviction: Number(a.conviction),
      tier: deriveTier(Number(a.weight)),
      positive_traits: pos,
      critical_traits: crit,
      initial_comment: "",
      has_left: false,
      hidden_agenda: a.hidden_agenda ?? "",
    };
  });
}

export function mapMessagesToUI(rows: DbMessage[]): UiMessage[] {
  return rows.map((m) => {
    let type: SenderType;
    if (m.sender === "user") type = "user";
    else if (m.sender === "system") type = "system";
    else type = "agent";
    return {
      id: m.id,
      sender_type: type,
      agent_id: m.agent_id,
      addressed_to: m.addressed_to,
      content: m.content,
      created_at: m.created_at,
    };
  });
}

/** Σ(conviction × weight) / Σ(weight) × 100, arrondi. */
export function computeTCG(agents: { conviction: number; weight: number; has_left?: boolean }[]): number {
  const alive = agents.filter((a) => !a.has_left);
  if (alive.length === 0) return 0;
  const totalW = alive.reduce((s, a) => s + a.weight, 0) || 1;
  const num = alive.reduce((s, a) => s + a.conviction * a.weight, 0);
  return Math.round((num / totalW) * 100);
}

/** Variation ≤ 2 pts sur les 3 dernières valeurs. */
export function detectStagnation(history: number[]): boolean {
  if (history.length < 3) return false;
  const last = history.slice(-3);
  const min = Math.min(...last);
  const max = Math.max(...last);
  return max - min <= 2;
}

export function stateColor(conviction: number): string {
  if (conviction < 0.35) return "var(--marker-red)";
  if (conviction < 0.65) return "var(--marker-amber)";
  return "var(--marker-green)";
}

/** Construit un product_context compatible avec le moteur existant à partir des sliders. */
export function buildPlaceholderContext(opts: { clients: number; experts: number }) {
  return {
    product: "Solution professionnelle à présenter au comité",
    target_customer: `${opts.clients} client·s potentiel·s, ${opts.experts} expert·s métier`,
    price: "Tarification adaptée au profil de chaque interlocuteur",
    value_proposition: "Réponse concrète aux enjeux opérationnels du comité",
    expected_objection: "Le statu quo et le coût de changement",
    goal: "Convaincre la table et obtenir un engagement clair",
    batna: "Reporter la décision et revenir avec une offre ajustée",
  };
}

/** Helper pour styler par tier dans les composants. */
export function tierStyle(tier: Tier): { bg: string; ring: string; icon: ReactNode | null } {
  return { bg: "transparent", ring: tierMeta(tier).color, icon: null };
}