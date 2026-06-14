import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getPanel, type InvestorPublic as Investor } from "@/lib/pitch.functions";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/_authenticated/personas")({
  validateSearch: searchSchema,
  component: PersonasPage,
});

function PersonasPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const fetchPanel = useServerFn(getPanel);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pitch-panel", id],
    queryFn: () => fetchPanel({ data: { session_id: id! } }),
    enabled: !!id,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="card-sketch-lg" style={{ backgroundColor: "var(--violet-pitch-soft)" }}>
          <span className="badge-stamp">Salle de pitch</span>
          <h1 className="font-hand text-4xl font-bold mt-3">Votre panel d'investisseurs</h1>
          <p className="font-sketch text-lg mt-2 text-ink-soft">
            Repérez leurs thèses, leurs traits, et préparez votre angle avant d'entrer en salle.
          </p>
          {data?.session && (
            <p className="font-sketch mt-2 text-sm">
              Stage : <strong>{data.session.pitch_stage}</strong> · Objectif :{" "}
              <strong>{data.session.win_condition?.replace("_", " ")}</strong>
              {data.session.target_amount ? (
                <> · Round visé : <strong>{Number(data.session.target_amount).toLocaleString("fr-FR")}€</strong></>
              ) : null}
            </p>
          )}
        </div>

        {!id ? (
          <EmptyState />
        ) : isLoading ? (
          <div className="card-sketch text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            <p className="font-hand mt-2">Chargement du panel…</p>
          </div>
        ) : error ? (
          <div className="card-sketch text-center">
            <p className="font-hand text-xl text-destructive">Erreur de chargement</p>
            <p className="text-sm mt-1">{(error as Error).message}</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-5">
              {data?.investors.map((inv, i) => (
                <InvestorCard key={inv.id} inv={inv} tilt={i % 2 === 0 ? "tilt-neg-1" : "tilt-1"} />
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/simulation", search: { id } })}
                style={{ backgroundColor: "var(--violet-pitch)", color: "white" }}
                className="font-hand text-lg border-[1.5px] border-ink shadow-[var(--shadow-sketch-lg)]"
              >
                Entrer en salle de pitch →
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="card-sketch text-center">
      <p className="font-hand text-xl">Aucune session sélectionnée.</p>
      <Button asChild variant="link" className="mt-2">
        <Link to="/setup">Configurer un pitch</Link>
      </Button>
    </div>
  );
}


function InvestorCard({ inv, tilt }: { inv: Investor; tilt: string }) {
  const ticket = inv.ticket_min && inv.ticket_max
    ? `${(Number(inv.ticket_min) / 1000).toFixed(0)}k – ${(Number(inv.ticket_max) / 1_000_000).toFixed(1)}M€`
    : "—";
  return (
    <div className={`card-sketch-lg ${tilt}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full border-[1.5px] border-ink flex items-center justify-center font-hand text-xl font-bold shrink-0"
          style={{ backgroundColor: "var(--violet-pitch-soft)" }}
        >
          {inv.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h3 className="font-hand text-2xl font-bold leading-tight">{inv.name}</h3>
          <p className="text-sm text-ink-soft">
            {inv.age ? `${inv.age} ans · ` : ""}{inv.investor_type}
          </p>
          <p className="text-sm font-sketch">{inv.fund_name}</p>
        </div>
      </div>

      <div className="mt-3 postit-blue text-sm" style={{ padding: "0.5rem 0.7rem" }}>
        <strong>Ticket :</strong> {ticket}
      </div>

      <p className="font-sketch mt-3 text-[0.95rem] leading-snug">
        <span className="ink-underline">Thèse</span> : {inv.investment_thesis}
      </p>
      {inv.portfolio_pattern && (
        <p className="text-sm mt-2 text-ink-soft italic">📈 {inv.portfolio_pattern}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="postit" style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}>
          ✅ {inv.positive_traits}
        </div>
        <div className="postit-pink" style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}>
          ⚠️ {inv.critical_traits}
        </div>
      </div>
    </div>
  );
}