import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActiveCard } from "@/components/ActiveCard";
import { LockedCard } from "@/components/LockedCard";

export const Route = createFileRoute("/_authenticated/formation-b2b/")({
  component: B2BFormationsPage,
});

function B2BFormationsPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quelle formation commerciale&nbsp;?</h1>
        <p className="mt-2 text-muted-foreground">
          En tant que commercial, sur quoi voulez-vous progresser&nbsp;?
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ActiveCard
          title="Cahier de vente B2B"
          description="Closer un deal complexe face à un comité d'achat exigeant."
          onClick={() => navigate({ to: "/formation-b2b/setup" })}
        />
        <ActiveCard
          title="Labo des Prix & Concessions"
          description="Équilibrer la balance : ne jamais céder sans contrepartie."
          onClick={() => navigate({ to: "/formation-b2b/labo-prix" })}
        />
        <LockedCard
          title="Vente consultative"
          description="Découvrir les besoins profonds et co-construire la solution."
        />
        <LockedCard
          title="Renouvellement & upsell"
          description="Fidéliser un compte clé et étendre l'usage."
        />
      </div>
    </AppShell>
  );
}