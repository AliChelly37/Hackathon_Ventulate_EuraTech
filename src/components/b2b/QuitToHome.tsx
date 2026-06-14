import { useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";

/** Bouton "Quitter" dessiné à la main → retour à /profiles. */
export function QuitToHome() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/profiles" })}
      aria-label="Quitter et revenir à l'accueil"
      className="sketch-btn"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        padding: "0.4rem 0.9rem",
        background: "var(--paper)",
        borderColor: "var(--ink)",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
      }}
    >
      <Home size={14} />
      <span className="handwritten" style={{ color: "var(--ink)", fontSize: "1.1rem" }}>
        Quitter
      </span>
    </button>
  );
}