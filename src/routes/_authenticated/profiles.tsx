import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActiveCard } from "@/components/ActiveCard";

export const Route = createFileRoute("/_authenticated/profiles")({ component: ProfilesPage });

function ProfilesPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Qui voulez-vous incarner ?</h1>
        <p className="mt-2 text-muted-foreground">Choisissez le profil que vous souhaitez entraîner.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ActiveCard title="Entrepreneur" description="Défendez votre produit face à des clients et des fournisseurs." onClick={() => navigate({ to: "/pitch-setup" })} />
        <ActiveCard title="Commercial / Vente" description="Closer un deal complexe." onClick={() => navigate({ to: "/formation-b2b" })} />
        <ActiveCard title="Manager / Leader" description="Aligner une équipe sur une décision difficile." onClick={() => navigate({ to: "/formation-manager" })} />
        <ActiveCard title="Candidat" description="Négocier un poste et un salaire." onClick={() => navigate({ to: "/formation-candidat" })} />
      </div>
    </AppShell>
  );
}