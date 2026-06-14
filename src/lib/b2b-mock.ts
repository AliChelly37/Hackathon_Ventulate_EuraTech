/** Données mock pour le mode démo Mock_B2B (aucun appel API). */

export const MOCK_B2B_REPORT = {
  verdict: "Term sheet décroché",
  verdict_tone: "win" as "win" | "loss" | "draw",
  score_global: 78,
  skills: [
    { id: "discovery", label: "Découverte", score: 82 },
    { id: "value", label: "Valeur & Pricing", score: 74 },
    { id: "multi", label: "Multi-threading", score: 65 },
    { id: "calib", label: "Calibration", score: 88 },
  ],
  wins: [
    "Tu as ancré le ROI dès la phase Découverte (gain 20%/siège).",
    "Tu as tenu le prix face à la demande de remise du CFO.",
    "Ta prédiction à 60% en phase Closing était calibrée.",
  ],
  improvements: [
    "Trop peu de questions ouvertes sur les enjeux de la COO.",
    "Pas de plan de mutual close proposé à la fin.",
    "Multi-threading faible : un seul interlocuteur engagé.",
  ],
};

export const MOCK_B2B_PROJECTION = {
  months: [6, 12, 24, 36],
  trajectories: [
    { id: "opt", label: "Optimiste", color: "var(--marker-green)", arr: [120, 420, 1200, 2800] },
    { id: "base", label: "Base",      color: "var(--marker-teal)",  arr: [80, 260, 720, 1500] },
    { id: "pess", label: "Pessimiste", color: "var(--marker-red)",  arr: [50, 140, 320, 600] },
  ],
  // axes: probabilité (1-5) × impact (1-5)
  risks: [
    { id: "price-war", label: "Guerre des prix",   probability: 4, impact: 5, color: "#EF4444" },
    { id: "churn",     label: "Churn clients",     probability: 3, impact: 4, color: "#F59E0B" },
    { id: "hiring",    label: "Hiring sales",      probability: 4, impact: 3, color: "#8B5CF6" },
    { id: "cac",       label: "CAC qui dérape",    probability: 3, impact: 3, color: "#2DD4BF" },
    { id: "reg",       label: "Risque régulation", probability: 2, impact: 4, color: "#F472B6" },
  ],
};

export type B2BReport = typeof MOCK_B2B_REPORT;
export type B2BProjection = typeof MOCK_B2B_PROJECTION;