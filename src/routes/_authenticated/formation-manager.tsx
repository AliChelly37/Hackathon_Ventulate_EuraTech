import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ActiveCard } from "@/components/ActiveCard";

export const Route = createFileRoute("/_authenticated/formation-manager")({
  component: ManagerFormationsPage,
});

const FORMATIONS = [
  { title: "Gestion de projet complexe", description: "Aligner les parties prenantes sur des délais serrés." },
  { title: "Leadership & Organisation", description: "Fédérer une équipe autour d'une nouvelle structure." },
  { title: "Résolution de conflit", description: "Désamorcer une crise entre deux collaborateurs." },
  { title: "Défendre son budget", description: "Négocier les ressources avec la direction." },
];

function ManagerFormationsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-hand">Quelle formation de leader&nbsp;?</h1>
        <p className="mt-2 text-muted-foreground">
          En tant que manager, sur quoi voulez-vous progresser&nbsp;?
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