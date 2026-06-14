import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapAgentsToUI, type UiAgent } from "@/lib/adapters/negociation";
import { PersonaCard } from "@/components/nego/PersonaCard";
import { QuitButton } from "@/components/nego/QuitButton";
import { BackButton } from "@/components/BackButton";

const search = z.object({ id: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/_authenticated/formation-negociation/personas")({
  validateSearch: zodValidator(search),
  component: PersonasPage,
});

function PersonasPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<UiAgent[] | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("agents")
      .select("*")
      .eq("session_id", id)
      .order("order_index")
      .then(({ data }) => setAgents(mapAgentsToUI((data ?? []) as never)));
  }, [id]);

  return (
    <div className="nego-bg min-h-screen page-fade" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="handwritten" style={{ fontSize: "2.5rem", color: "var(--ink)" }}>Votre comité</h1>
        <p className="mt-1" style={{ color: "#6B7280" }}>Voici les personnes qui vont vous évaluer.</p>

        {!agents ? (
          <div className="flex items-center gap-2 mt-10" style={{ color: "var(--marker-teal)" }}>
            <Loader2 className="animate-spin" /> <span className="handwritten" style={{ fontSize: "1.2rem" }}>Chargement…</span>
          </div>
        ) : (
          <div
            className="mt-8"
            style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
          >
            {agents.map((a, i) => (
              <PersonaCard key={a.id} agent={a} tilt={i % 2 === 0 ? -0.8 : 0.8} />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-10">
          <button
            disabled={!agents || agents.length === 0}
            onClick={() => navigate({ to: "/formation-negociation/simulation", search: { id } })}
            className="sketch-btn sketch-btn-primary"
          >
            <span style={{ color: "var(--ink)" }}>Entrer dans l'arène</span>
          </button>
        </div>
      </div>
    </div>
  );
}