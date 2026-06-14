import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActiveCard } from "@/components/ActiveCard";
import { LockedCard } from "@/components/LockedCard";

export const Route = createFileRoute("/_authenticated/skills")({ component: SkillsPage });

function SkillsPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quelle compétence ?</h1>
        <p className="mt-2 text-muted-foreground">En tant qu'entrepreneur, sur quoi voulez-vous progresser ?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ActiveCard title="Négociation" description="Convaincre une table de clients et fournisseurs sceptiques." onClick={() => navigate({ to: "/formation-negociation/setup" })} />
        <ActiveCard title="Pitch" description="Présenter votre projet à un panel d'investisseurs." onClick={() => navigate({ to: "/setup", search: { skill: "pitch" } })} />
        <LockedCard title="Levée de fonds" description="Mener un tour de table." />
        <LockedCard title="Gestion de conflit" description="Désamorcer une crise d'équipe." />
      </div>
    </AppShell>
  );
}