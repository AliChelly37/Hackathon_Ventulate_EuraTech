import type { ReactNode } from "react";

/** Enrobe une carte d'agent pour signaler qu'il a quitté la table :
 *  grande rature crayon rouge (stroke-dashoffset 0.8s) + tache de café
 *  brune semi-transparente en fondu (scale 0→1, 1s). La carte enfant
 *  passe en grayscale + opacity-50. */
export function LeftTableEffect({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "grayscale(1)", opacity: 0.5, transition: "filter .4s, opacity .4s" }}>
        {children}
      </div>
      {/* Tache de café */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "20%",
          left: "55%",
          width: 90,
          height: 70,
          borderRadius: "50% 45% 55% 50% / 60% 50% 50% 40%",
          background: "radial-gradient(ellipse at 35% 35%, #7B4A1E66 0%, #5B3514AA 55%, transparent 75%)",
          transformOrigin: "center",
          animation: "nego-stain 1s ease-out forwards",
          pointerEvents: "none",
        }}
      />
      {/* Rature crayon rouge */}
      <svg
        aria-hidden
        viewBox="0 0 300 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <path
          d="M 10 95 C 60 20, 120 110, 180 30 S 280 100, 295 25"
          fill="none"
          stroke="var(--marker-red)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={400}
          style={{ animation: "nego-scratch .8s ease-out forwards" }}
        />
      </svg>
    </div>
  );
}