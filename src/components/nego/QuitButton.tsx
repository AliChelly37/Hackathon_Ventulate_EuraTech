import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

/**
 * Bouton "Quitter" persistant — retourne instantanément à la page d'accueil
 * (sélection des compétences). Affiché en haut à droite, par-dessus la page.
 */
export function QuitButton() {
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
        padding: "0.35rem 0.8rem",
        background: "var(--paper)",
        borderColor: "var(--ink)",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
      }}
    >
      <LogOut size={14} />
      <span className="handwritten" style={{ color: "var(--ink)", fontSize: "1.05rem" }}>
        Quitter
      </span>
    </button>
  );
}