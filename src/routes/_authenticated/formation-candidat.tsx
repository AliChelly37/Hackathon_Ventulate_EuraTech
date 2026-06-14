import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ActiveCard } from "@/components/ActiveCard";

export const Route = createFileRoute("/_authenticated/formation-candidat")({
  component: CandidatFormationsPage,
});

const FORMATIONS = [
  { title: "Négociation de salaire", description: "Défendre ses prétentions face aux RH." },
  { title: "Défendre son CV", description: "Justifier un parcours atypique ou un trou dans le CV." },
  { title: "Entretien de Fit Culturel", description: "Convaincre les futurs collègues." },
  { title: "Demande de promotion", description: "Négocier une évolution en interne." },
];

function CandidatFormationsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-hand">Quelle formation candidat&nbsp;?</h1>
        <p className="mt-2 text-muted-foreground">
          En tant que candidat, sur quoi voulez-vous progresser&nbsp;?
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FORMATIONS.map((f) => (
          <ActiveCard
            key={f.title}
            title={f.title}
            description={f.description}
            onClick={() => toast.info(`"${f.title}" — module bientôt disponible`)}
          />
        ))}
      </div>
    </AppShell>
  );
}