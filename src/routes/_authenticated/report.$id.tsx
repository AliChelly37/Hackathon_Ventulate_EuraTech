import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { generateReport } from "@/lib/session.functions";
import { generateReportPitch, getSimulation, type PitchReport } from "@/lib/pitch.functions";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Crown, TrendingUp, FileSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/$id")({ component: ReportRouter });

interface Report { outcome: string; final_t: number; positives: string[]; negatives: string[]; tips: string[]; timeline: Array<{ kind: string; turn?: number; text: string }>; }

function ReportRouter() {
  const { id } = Route.useParams();
  const getSim = useServerFn(getSimulation);
  const [skill, setSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSim({ data: { session_id: id } })
      .then((r) => setSkill((r.session.skill as string) ?? "negotiation"))
      .catch(() => setSkill("negotiation"));
  }, [id, getSim]);

  if (error) return (<AppShell><p className="text-destructive">{error}</p></AppShell>);
  if (!skill) return (<AppShell><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div></AppShell>);
  return skill === "pitch" ? <PitchReportView id={id} /> : <NegotiationReportView id={id} />;
}

function NegotiationReportView({ id }: { id: string }) {
  const gen = useServerFn(generateReport);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gen({ data: { session_id: id } })
      .then((r) => setReport(r as unknown as Report))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [id, gen]);

  if (error) return (<AppShell><p className="text-destructive">{error}</p><Button asChild className="mt-4 rounded-full"><Link to="/profiles">Retour</Link></Button></AppShell>);
  if (!report) return (<AppShell><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Préparation du débrief…</div></AppShell>);

  const summary = report.timeline.find((t) => t.kind === "summary")?.text ?? "";
  const pivots = report.timeline.filter((t) => t.kind === "pivot");
  const won = report.outcome === "won";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="rounded-3xl border bg-card p-8 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Débrief</p>
          <h1 className="text-4xl font-bold mt-2">{won ? "Vous les avez convaincus 🎉" : "Pas cette fois."}</h1>
          <p className="mt-2 text-muted-foreground">Conviction finale : <span className="font-semibold text-foreground">{Math.round(report.final_t * 100)}%</span></p>
          <p className="mt-4 max-w-xl mx-auto">{summary}</p>
        </header>
        <section className="rounded-3xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Moments-clés</h2>
          <ol className="space-y-2">{pivots.map((p, i) => (<li key={i} className="flex gap-3"><span className="font-semibold text-primary tabular-nums">T{p.turn}</span><span>{p.text}</span></li>))}</ol>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" style={{ color: "var(--color-conviction-80)" }} />Points positifs</h2>
            <ul className="space-y-2">{report.positives.map((it, i) => (<li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{it}</span></li>))}</ul>
          </section>
          <section className="rounded-3xl border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5" style={{ color: "var(--color-conviction-40)" }} />Points à améliorer</h2>
            <ul className="space-y-2">{report.negatives.map((it, i) => (<li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{it}</span></li>))}</ul>
          </section>
        </div>
        <section className="rounded-3xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Pour la prochaine fois</h2>
          <ol className="space-y-3">{report.tips.map((t, i) => (<li key={i} className="flex gap-3"><span className="font-bold text-primary tabular-nums">{i + 1}.</span><span>{t}</span></li>))}</ol>
        </section>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full"><Link to="/profiles">Accueil</Link></Button>
          <Button asChild className="rounded-full"><Link to="/intake">Nouvelle session</Link></Button>
        </div>
      </div>
    </AppShell>
  );
}

function PitchReportView({ id }: { id: string }) {
  const gen = useServerFn(generateReportPitch);
  const [r, setR] = useState<PitchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gen({ data: { session_id: id } })
      .then(setR)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [id, gen]);

  if (error) return (<AppShell><p className="text-destructive">{error}</p><Button asChild className="mt-4 rounded-full"><Link to="/profiles">Retour</Link></Button></AppShell>);
  if (!r) return (<AppShell><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Analyse du pitch…</div></AppShell>);

  const verdictColor = (v: string) =>
    v === "in" ? "bg-[#FEF9C3]" : v === "watching" ? "bg-[#DBEAFE]" : "bg-[#FECACA]";
  const outcomeLabel =
    r.outcome === "victory" ? "Pitch convaincant 🎉" : r.outcome === "draw" ? "Panel partagé" : "Pitch à retravailler";
  const winLabel: Record<string, string> = {
    term_sheet: "Term Sheet", hard_yes: "Hard Yes", lead_round: "Lead Round", high_interest: "Intérêt élevé",
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. Score header */}
        <header className="card-sketch tilt-neg-1 p-8 text-center bg-[#FEF3C7]">
          <p className="text-xs uppercase tracking-wider font-hand text-muted-foreground">Débrief Pitch — {winLabel[r.win_condition] ?? r.win_condition}</p>
          <h1 className="text-4xl font-hand mt-2">{outcomeLabel}</h1>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-6xl font-bold tabular-nums">{r.score}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="mt-4 max-w-2xl mx-auto">{r.summary}</p>
        </header>

        {/* 2. Verdicts grid */}
        <section className="card-sketch p-6">
          <h2 className="font-hand text-2xl mb-4 ink-underline inline-block">Ce qu'ils pensaient vraiment</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {r.investors.map((inv) => (
              <div key={inv.agent_id} className={`card-sketch tilt-1 p-4 ${verdictColor(inv.verdict)}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{inv.name}</span>
                  {inv.is_lead_candidate && <Crown className="h-4 w-4" />}
                </div>
                <p className="text-xs text-muted-foreground">{inv.investor_type}</p>
                <p className="mt-2 text-xs font-hand uppercase tracking-wider">Verdict: {inv.verdict}</p>
                <p className="mt-2 text-sm">{inv.remark}</p>
                {inv.hidden_agenda && (
                  <p className="mt-2 text-xs italic text-muted-foreground">🤫 {inv.hidden_agenda}</p>
                )}
                <div className="mt-3 flex gap-3 text-xs">
                  <span>Qualité {inv.pitch_quality_score}</span>
                  <span>Pertinence {inv.relevance_score}</span>
                </div>
                {inv.proposed_valuation && (
                  <p className="mt-2 text-xs">💰 {inv.proposed_ticket}k @ {inv.proposed_valuation}M</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Radar */}
        <section className="card-sketch p-6">
          <h2 className="font-hand text-2xl mb-4 ink-underline inline-block">Score par dimension</h2>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(r.radar).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="h-32 flex items-end justify-center">
                  <div className="w-8 bg-primary rounded-t" style={{ height: `${v}%` }} />
                </div>
                <p className="text-xs font-hand mt-2 capitalize">{k}</p>
                <p className="text-sm font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Lead + DD */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card-sketch tilt-1 p-6 bg-[#DBEAFE]">
            <h2 className="font-hand text-xl mb-2 flex items-center gap-2"><Crown className="h-5 w-5" />Lead Investor</h2>
            {r.lead_analysis.has_lead ? (
              <p><strong>{r.lead_analysis.lead_name}</strong> a émergé comme lead. {r.lead_analysis.reason}</p>
            ) : (
              <p>Aucun lead clair. {r.lead_analysis.reason}</p>
            )}
          </section>
          <section className="card-sketch tilt-neg-1 p-6 bg-[#FCE7F3]">
            <h2 className="font-hand text-xl mb-2 flex items-center gap-2"><FileSearch className="h-5 w-5" />Due Diligence</h2>
            <p className="text-sm">{r.dd_summary.questions_count} questions DD soulevées</p>
            <ul className="mt-2 space-y-1 text-sm">
              {r.dd_summary.topics.map((t, i) => (<li key={i}>• {t}</li>))}
            </ul>
          </section>
        </div>

        {/* 5. Positives/Negatives */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card-sketch p-6">
            <h2 className="font-hand text-xl mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" style={{ color: "var(--color-conviction-80)" }} />Points forts</h2>
            <ul className="space-y-2">{r.positives.map((it, i) => (<li key={i} className="flex gap-2"><span>•</span><span>{it}</span></li>))}</ul>
          </section>
          <section className="card-sketch p-6">
            <h2 className="font-hand text-xl mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5" style={{ color: "var(--color-conviction-40)" }} />À améliorer</h2>
            <ul className="space-y-2">{r.negatives.map((it, i) => (<li key={i} className="flex gap-2"><span>•</span><span>{it}</span></li>))}</ul>
          </section>
        </div>

        {/* 6. Timeline */}
        {r.timeline.length > 0 && (
          <section className="card-sketch p-6">
            <h2 className="font-hand text-2xl mb-4 ink-underline inline-block flex items-center gap-2"><TrendingUp className="h-5 w-5" />Moments-clés</h2>
            <ol className="space-y-2">{r.timeline.map((p, i) => (<li key={i} className="flex gap-3"><span className="font-bold text-primary tabular-nums">T{p.turn}</span><span className="text-xs uppercase font-hand text-muted-foreground">{p.kind}</span><span>{p.text}</span></li>))}</ol>
          </section>
        )}

        {/* 7. Tips */}
        <section className="card-sketch tilt-1 p-6 bg-[#FEF9C3]">
          <h2 className="font-hand text-xl mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Pour la prochaine fois</h2>
          <ol className="space-y-2">{r.tips.map((t, i) => (<li key={i} className="flex gap-3"><span className="font-bold text-primary tabular-nums">{i + 1}.</span><span>{t}</span></li>))}</ol>
        </section>

        {/* 8. Readings */}
        <section className="card-sketch p-6">
          <h2 className="font-hand text-xl mb-3">Lectures recommandées</h2>
          <ul className="space-y-1">{r.recommended_readings.map((rd, i) => (<li key={i}>📖 {rd}</li>))}</ul>
        </section>

        <div className="flex justify-center gap-3 pb-8">
          <Button asChild variant="outline" className="rounded-full"><Link to="/profiles">Accueil</Link></Button>
          <Button asChild className="rounded-full"><Link to="/setup">Nouveau pitch</Link></Button>
        </div>
      </div>
    </AppShell>
  );
}