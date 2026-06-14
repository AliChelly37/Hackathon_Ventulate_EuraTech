// Pitch Investor Score (PIS) utilities. Aliases conviction math for the pitch skill,
// plus pitch-specific score helpers (term sheet, hard yes count, lead round).

import { computeConviction, convictionColor, type AgentState } from "./conviction";

export interface PitchAgentState extends AgentState {
  proposed_valuation?: number | null;
  proposed_ticket?: number | null;
  commitment_status?: string | null;
  is_lead_candidate?: boolean | null;
  has_left?: boolean | null;
}

/**
 * PIS = pondération pondérée des intérêts (alias de la formule TCG/conviction).
 * Retourne un nombre 0..1 ; multiplie par 100 pour l'affichage en %.
 */
export const calculatePIS = (agents: AgentState[]): number =>
  computeConviction(agents).T;

/**
 * Score term sheet : 50% basé sur la valuation moyenne proposée vs cible,
 * 50% sur le montant total engagé vs cible. Retourne un entier 0..100.
 */
export const calculateTermSheetScore = (
  agents: PitchAgentState[],
  targetValuation: number,
  targetAmount: number,
): number => {
  const active = agents.filter(
    (a) => a.proposed_valuation != null && a.proposed_valuation > 0 && !a.has_left,
  );
  if (active.length === 0 || targetValuation <= 0 || targetAmount <= 0) return 0;
  const avgVal =
    active.reduce((s, a) => s + (a.proposed_valuation ?? 0), 0) / active.length;
  const sumAmt = active.reduce((s, a) => s + (a.proposed_ticket ?? 0), 0);
  const valScore = Math.min(1, avgVal / targetValuation);
  const amtScore = Math.min(1, sumAmt / targetAmount);
  return Math.round((0.5 * valScore + 0.5 * amtScore) * 100);
};

/** Nombre d'investisseurs en statut hard_yes (non partis). */
export const countHardYes = (agents: PitchAgentState[]): number =>
  agents.filter((a) => !a.has_left && a.commitment_status === "hard_yes").length;

/**
 * Round réalisable : un lead candidat en hard_yes + au moins 2 followers
 * (soft_yes ou hard_yes), tous actifs.
 */
export const hasLeadRound = (agents: PitchAgentState[]): boolean => {
  const active = agents.filter((a) => !a.has_left);
  const lead = active.find(
    (a) => a.is_lead_candidate && a.commitment_status === "hard_yes",
  );
  const followers = active.filter(
    (a) =>
      !a.is_lead_candidate &&
      (a.commitment_status === "soft_yes" || a.commitment_status === "hard_yes"),
  ).length;
  return Boolean(lead) && followers >= 2;
};

/** Alias sémantique : "intérêt" d'un investisseur = "conviction" d'un client. */
export { convictionColor as interestColor };

export type WinCondition = "pis_score" | "term_sheet" | "hard_yes" | "lead_round";
export type PitchStage = "seed" | "series_a";
export type Phase = "free_pitch" | "discussion" | "debrief" | "concluded";
export type InterestSignal =
  | "cold"
  | "curious"
  | "engaged"
  | "leaning_in"
  | "committing"
  | "passing";
export type CommitmentStatus =
  | "undecided"
  | "maybe"
  | "soft_no"
  | "soft_yes"
  | "hard_yes"
  | "pass";
export type InvestorType =
  | "angel"
  | "fund_partner"
  | "principal"
  | "scout"
  | "family_office"
  | "corporate_vc";

export const INTEREST_SIGNAL_LABEL: Record<InterestSignal, string> = {
  cold: "❄️ Cold",
  curious: "🟡 Curious",
  engaged: "🟢 Engaged",
  leaning_in: "🟢 Leaning in",
  committing: "🚀 Committing",
  passing: "🔴 Passing",
};

export const INVESTOR_TYPE_LABEL: Record<InvestorType, string> = {
  angel: "🪽 Angel",
  fund_partner: "💼 Partner",
  principal: "🎓 Principal",
  scout: "🔍 Scout",
  family_office: "🏛️ Family Office",
  corporate_vc: "🏢 Corporate VC",
};

export const WIN_CONDITION_LABEL: Record<WinCondition, string> = {
  pis_score: "Convaincre le panel (PIS ≥ 70%)",
  term_sheet: "Décrocher un term sheet",
  hard_yes: "Récolter N Hard Yes",
  lead_round: "Trouver un Lead + 2 co-investisseurs",
};

/** Liste des colonnes PUBLIQUES de la table agents à requêter côté client. */
export const PUBLIC_AGENT_COLUMNS = [
  "id",
  "session_id",
  "name",
  "age",
  "role",
  "weight",
  "conviction",
  "order_index",
  "investor_type",
  "fund_name",
  "ticket_min",
  "ticket_max",
  "investment_thesis",
  "portfolio_pattern",
  "positive_traits",
  "critical_traits",
  "initial_comment",
  "verbal_tic",
  "main_objection",
  "positive_trigger",
  "red_flag",
  "dd_depth_level",
  "dd_questions_asked",
  "interest_signal",
  "commitment_status",
  "proposed_valuation",
  "proposed_ticket",
  "is_lead_candidate",
  "has_left",
  "consecutive_bad_turns",
  "debrief_verdict",
  "debrief_positive_remarks",
  "debrief_negative_remarks",
  "debrief_pitch_quality_score",
  "debrief_relevance_score",
].join(",");

/** Champs PRIVÉS — ne jamais sélectionner côté client. Liste utilitaire/documentation. */
export const PRIVATE_AGENT_COLUMNS = [
  "hidden_agenda",
  "thesis_fit_real",
  "secret_dealbreaker",
  "pattern_match_internal",
  "alpha_score",
] as const;