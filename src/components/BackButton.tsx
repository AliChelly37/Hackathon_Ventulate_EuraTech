import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Bouton "Retour" — style dessin au trait, cohérent Sketchbook.
 * Variant "fixed" : positionné en haut-gauche par-dessus la page (pour les
 * pages sans AppShell). Variant "inline" : à intégrer dans une barre.
 */
export function BackButton({ variant = "inline" }: { variant?: "fixed" | "inline" }) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/profiles" });
    }
  };
  const fixedStyle =
    variant === "fixed"
      ? {
          position: "fixed" as const,
          top: 16,
          left: 16,
          zIndex: 50,
          background: "var(--paper)",
          borderColor: "var(--ink)",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
        }
      : {};
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Retour à la page précédente"
      className="sketch-btn"
      style={{ padding: "0.35rem 0.8rem", ...fixedStyle }}
    >
      <ArrowLeft size={14} />
      <span className="handwritten" style={{ color: "var(--ink)", fontSize: "1.05rem" }}>
        Retour
      </span>
    </button>
  );
}