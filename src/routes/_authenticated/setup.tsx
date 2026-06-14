import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createSession } from "@/lib/session.functions";
import { createPitchSession, type PitchContext } from "@/lib/pitch.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAiPlaceholders, resolveValue } from "@/hooks/useAiPlaceholders";

const setupSearchSchema = z.object({
  skill: z.enum(["negotiation", "pitch"]).optional(),
});

export const Route = createFileRoute("/_authenticated/setup")({
  component: SetupPage,
  validateSearch: setupSearchSchema,
});

type Skill = "negotiation" | "pitch";
type Stage = PitchContext["pitch_stage"];
type Win = PitchContext["win_condition"];

function SetupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [skill, setSkill] = useState<Skill>(search.skill ?? "negotiation");
  const [mode, setMode] = useState<"chrono" | "libre">("chrono");
  const [loading, setLoading] = useState(false);
  const createNego = useServerFn(createSession);
  const createPitch = useServerFn(createPitchSession);

  // Pitch fields
  const [stage, setStage] = useState<Stage>("seed");
  const [panelSize, setPanelSize] = useState(4);
  const [expertRatio, setExpertRatio] = useState(0.5);
  const [win, setWin] = useState<Win>("term_sheet");
  const [amount, setAmount] = useState("1500000");
  const [valuation, setValuation] = useState("8000000");
  const [problem, setProblem] = useState("");
  const [traction, setTraction] = useState("");
  const [team, setTeam] = useState("");
  const [ask, setAsk] = useState("");

  // Pull product context from intake for AI-generated placeholders
  const intakeContext = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = sessionStorage.getItem("intake_answers");
      if (!raw) return "";
      const o = JSON.parse(raw) as Record<string, unknown>;
      return [o.product, o.value_proposition, o.target_customer, o.price, o.goal]
        .filter((v) => typeof v === "string" && v) .join("\n");
    } catch { return ""; }
  }, []);
  const pitchFields = useMemo(
    () => [
      { key: "problem", label: "Problème résolu" },
      { key: "traction", label: "Traction (clients, ARR, croissance)" },
      { key: "team", label: "Équipe (founders + expertise)" },
      { key: "ask", label: "Ce que tu demandes (montant + usage)" },
    ],
    [],
  );
  const { placeholders } = useAiPlaceholders(intakeContext, pitchFields);

  async function handleStartNego() {
    const raw = sessionStorage.getItem("intake_answers");
    if (!raw) { toast.error("Contexte produit manquant."); navigate({ to: "/intake" }); return; }
    setLoading(true);
    try {
      const product_context = JSON.parse(raw);
      const { session_id } = await createNego({ data: { game_mode: mode, product_context } });
      sessionStorage.removeItem("intake_answers");
      navigate({ to: "/play/$id", params: { id: session_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de création");
      setLoading(false);
    }
  }

  async function handleStartPitch() {
    const raw = sessionStorage.getItem("intake_answers");
    const intake = raw ? JSON.parse(raw) : {};
    // Rule: if a field is empty, use the AI-generated placeholder as the final answer.
    const finalProblem = resolveValue(problem, placeholders.problem);
    const finalTraction = resolveValue(traction, placeholders.traction);
    const finalTeam = resolveValue(team, placeholders.team);
    const finalAsk = resolveValue(ask, placeholders.ask);
    if (!finalProblem || !finalTraction || !finalTeam || !finalAsk) {
      toast.error("L'IA n'a pas encore généré de suggestions, patiente une seconde…");
      return;
    }
    setLoading(true);
    try {
      const pitch_context: PitchContext = {
        product: intake.product ?? intake.value_proposition ?? "Projet",
        pitch_stage: stage,
        target_amount: Number(amount),
        target_valuation: valuation ? Number(valuation) : undefined,
        win_condition: win,
        panel_size: panelSize,
        expert_ratio: expertRatio,
        problem: finalProblem,
        traction: finalTraction,
        team: finalTeam,
        ask: finalAsk,
      };
      const { session_id } = await createPitch({ data: { pitch_context } });
      navigate({ to: "/personas", search: { id: session_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de création");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Skill switcher */}
        <div className="flex gap-3 items-center">
          <span className="font-hand text-2xl">Skill :</span>
          <button
            onClick={() => setSkill("negotiation")}
            className={`postit tilt-neg-1 ${skill === "negotiation" ? "" : "opacity-50"}`}
            style={{ fontWeight: skill === "negotiation" ? 700 : 400 }}
          >Négociation</button>
          <button
            onClick={() => setSkill("pitch")}
            className={`postit tilt-1 ${skill === "pitch" ? "" : "opacity-50"}`}
            style={{
              backgroundColor: "var(--violet-pitch-soft)",
              fontWeight: skill === "pitch" ? 700 : 400,
            }}
          >Pitch Investisseur</button>
        </div>

        {skill === "negotiation" ? (
          <div className="card-sketch-lg">
            <h1 className="font-hand text-3xl font-bold">Choisissez votre mode de jeu</h1>
            <p className="mt-2 text-muted-foreground">Jouez contre le temps, ou prenez votre temps pour explorer.</p>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <Card onClick={() => setMode("chrono")} className={`p-5 cursor-pointer transition-all rounded-2xl ${mode === "chrono" ? "border-primary border-2 shadow-md" : "hover:border-primary/50"}`}>
                <h3 className="font-semibold text-lg">Mode Chrono</h3>
                <p className="text-sm text-muted-foreground mt-2">12 tours pour convaincre 70% de la table. Sinon, c'est perdu.</p>
              </Card>
              <Card onClick={() => setMode("libre")} className={`p-5 cursor-pointer transition-all rounded-2xl ${mode === "libre" ? "border-primary border-2 shadow-md" : "hover:border-primary/50"}`}>
                <h3 className="font-semibold text-lg">Mode Libre</h3>
                <p className="text-sm text-muted-foreground mt-2">Aucune limite. Jouez jusqu'à atteindre 70% de conviction.</p>
              </Card>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleStartNego} disabled={loading} className="rounded-full" size="lg">
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Préparation…</>) : "Démarrer la négociation"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="card-sketch-lg" style={{ borderColor: "var(--violet-pitch)" }}>
            <span className="badge-stamp">Salle de pitch</span>
            <h1 className="font-hand text-3xl font-bold mt-2">Configure ta levée</h1>

            {/* Stage */}
            <div className="mt-5">
              <Label className="font-sketch">Stage</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {(["pre_seed", "seed", "series_a", "series_b"] as Stage[]).map((s, i) => (
                  <button key={s}
                    onClick={() => setStage(s)}
                    className={`postit ${i % 2 === 0 ? "tilt-neg-1" : "tilt-1"}`}
                    style={{
                      backgroundColor: stage === s ? "var(--violet-pitch-soft)" : "var(--postit)",
                      fontWeight: stage === s ? 700 : 400, fontSize: "0.9rem", padding: "0.4rem 0.75rem",
                    }}
                  >{s.replace("_", " ")}</button>
                ))}
              </div>
            </div>

            {/* Panel & experts */}
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <div>
                <Label className="font-sketch">Taille panel : {panelSize}</Label>
                <input type="range" min={3} max={6} value={panelSize}
                  onChange={(e) => setPanelSize(Number(e.target.value))}
                  className="w-full mt-1 accent-[var(--violet-pitch)]" />
              </div>
              <div>
                <Label className="font-sketch">% experts sectoriels : {Math.round(expertRatio * 100)}%</Label>
                <input type="range" min={0} max={100} value={Math.round(expertRatio * 100)}
                  onChange={(e) => setExpertRatio(Number(e.target.value) / 100)}
                  className="w-full mt-1 accent-[var(--violet-pitch)]" />
              </div>
            </div>

            {/* Win condition */}
            <div className="mt-5">
              <Label className="font-sketch">Condition de victoire</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {([
                  ["term_sheet", "Décrocher un term sheet"],
                  ["hard_yes", "3+ hard yes (verbal)"],
                  ["lead_round", "Trouver un lead"],
                  ["high_interest", "Maintenir intérêt > 70%"],
                ] as [Win, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => setWin(k)}
                    className="card-sketch text-left"
                    style={{
                      backgroundColor: win === k ? "var(--violet-pitch-soft)" : "var(--card)",
                      borderColor: win === k ? "var(--violet-pitch)" : undefined,
                      borderWidth: win === k ? 2 : undefined,
                      padding: "0.6rem 0.8rem",
                    }}
                  >
                    <span className="font-hand text-lg">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount / valuation */}
            {(win === "term_sheet" || win === "lead_round") && (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <Label className="font-sketch">Montant cible (€)</Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
                </div>
                <div>
                  <Label className="font-sketch">Valorisation cible (€)</Label>
                  <Input value={valuation} onChange={(e) => setValuation(e.target.value)} type="number" />
                </div>
              </div>
            )}

            {/* Pitch content */}
            <div className="mt-5 space-y-3">
              <div>
                <Label className="font-sketch">Problème résolu</Label>
                <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={2}
                  placeholder={placeholders.problem || "L'IA prépare une suggestion…"} />
              </div>
              <div>
                <Label className="font-sketch">Traction</Label>
                <Textarea value={traction} onChange={(e) => setTraction(e.target.value)} rows={2}
                  placeholder={placeholders.traction || "L'IA prépare une suggestion…"} />
              </div>
              <div>
                <Label className="font-sketch">Équipe</Label>
                <Textarea value={team} onChange={(e) => setTeam(e.target.value)} rows={2}
                  placeholder={placeholders.team || "L'IA prépare une suggestion…"} />
              </div>
              <div>
                <Label className="font-sketch">Ce que tu demandes (ask)</Label>
                <Textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={2}
                  placeholder={placeholders.ask || "L'IA prépare une suggestion…"} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleStartPitch} disabled={loading} size="lg"
                className="font-hand text-lg border-[1.5px] border-ink shadow-[var(--shadow-sketch-lg)]"
                style={{ backgroundColor: "var(--violet-pitch)", color: "white" }}>
                {loading
                  ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération du panel…</>)
                  : "Générer le panel →"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}