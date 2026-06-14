// Conviction math + tunable constants. Used by both client (gauge rendering)
// and server (win/lose evaluation, prompt context).

export const CONVICTION_CONFIG = {
  LAMBDA: 0.6,
  TAU: 0.6,
  WIN_THRESHOLD: 0.7,
  HOLDOUT_WEIGHT: 0.3,
  HOLDOUT_FLOOR: 0.3,
  HOLDOUT_CAP: 0.65,
  DEFAULT_TURN_LIMIT: 12,
  AGENT_MIN: 3,
  AGENT_MAX: 5,
  STARTING_CONVICTION_MIN: 0.15,
  STARTING_CONVICTION_MAX: 0.4,
} as const;

export interface AgentState {
  id: string;
  weight: number;
  conviction: number; // 0..1
}

export interface ConvictionResult {
  D: number;
  B: number;
  T: number;
  capped: boolean;
  holdoutIds: string[];
}

export function computeConviction(agents: AgentState[]): ConvictionResult {
  if (agents.length === 0) {
    return { D: 0, B: 0, T: 0, capped: false, holdoutIds: [] };
  }
  const { LAMBDA, TAU, HOLDOUT_WEIGHT, HOLDOUT_FLOOR, HOLDOUT_CAP } =
    CONVICTION_CONFIG;

  const totalWeight = agents.reduce((s, a) => s + a.weight, 0) || 1;
  const D = agents.reduce((s, a) => s + (a.weight / totalWeight) * a.conviction, 0);
  const k = agents.filter((a) => a.conviction >= TAU).length;
  const B = k / agents.length;
  let T = LAMBDA * D + (1 - LAMBDA) * B;

  const holdoutIds = agents
    .filter((a) => a.weight >= HOLDOUT_WEIGHT && a.conviction < HOLDOUT_FLOOR)
    .map((a) => a.id);

  const capped = holdoutIds.length > 0 && T > HOLDOUT_CAP;
  if (capped) T = HOLDOUT_CAP;

  return { D, B, T, capped, holdoutIds };
}

// Maps a 0..1 conviction value to a CSS color via the satisfaction stops.
export function convictionColor(c: number): string {
  const v = Math.max(0, Math.min(1, c));
  if (v < 0.4) return "var(--color-conviction-0)";
  if (v < 0.6) return "var(--color-conviction-40)";
  if (v < 0.8) return "var(--color-conviction-60)";
  return "var(--color-conviction-80)";
}

export type Mood = "skeptical" | "neutral" | "interested" | "pleased";
export function moodFor(c: number): Mood {
  if (c < 0.3) return "skeptical";
  if (c < 0.6) return "neutral";
  if (c < 0.8) return "interested";
  return "pleased";
}