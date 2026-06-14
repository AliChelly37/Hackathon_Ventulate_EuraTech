import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getSimulation,
  analyzeFreePitch,
  transitionToDiscussion,
  sendMessagePitch,
  generateDebrief,
  type SimAgent,
  type SimMessage,
} from "@/lib/pitch.functions";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  id: z.string().optional(),
  demo_phase: z.enum(["free_pitch", "discussion", "debrief"]).optional(),
});

export const Route = createFileRoute("/_authenticated/simulation")({
  validateSearch: searchSchema,
  component: SimulationPage,
});

const TOPIC_LABELS: Record<string, string> = {
  problem: "Problème",
  solution: "Solution",
  market: "Marché",
  traction: "Traction",
  team: "Équipe",
  business_model: "Business model",
  competition: "Concurrence",
  ask: "Ask",
};
const ALL_TOPICS = Object.keys(TOPIC_LABELS);

function SimulationPage() {
  const { id, demo_phase } = Route.useSearch();
  const navigate = useNavigate();
  const fetchSim = useServerFn(getSimulation);
  const analyze = useServerFn(analyzeFreePitch);
  const transition = useServerFn(transitionToDiscussion);
  const sendMsg = useServerFn(sendMessagePitch);
  const runDebrief = useServerFn(generateDebrief);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["sim", id],
    queryFn: () => fetchSim({ data: { session_id: id! } }),
    enabled: !!id,
    // Ne polle PAS pendant le pitch libre : rien ne change côté serveur
    // tant que l'utilisateur ne clique pas "J'ai fini". Polling uniquement
    // pendant la discussion (les investisseurs répondent en async).
    refetchInterval: (q) => {
      const phase = (q.state.data as { session?: { phase?: string } } | undefined)?.session?.phase;
      return phase === "discussion" ? 4000 : false;
    },
  });

  if (!id) {
    return (
      <AppShell>
        <div className="card-sketch text-center">
          <p className="font-hand text-xl">Aucune session.</p>
          <Button asChild variant="link"><Link to="/setup">Démarrer un pitch</Link></Button>
        </div>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="card-sketch text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
          <p className="font-hand mt-2">Préparation de la salle…</p>
        </div>
      </AppShell>
    );
  }

  const phase = demo_phase ?? data.session.phase ?? "free_pitch";

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="badge-stamp">Pitch arena</span>
            <h1 className="font-hand text-3xl font-bold mt-2 capitalize">
              {phase === "free_pitch" ? "Le pitch libre" :
               phase === "discussion" ? "Discussion" :
               phase === "debrief" ? "Débrief" : phase}
            </h1>
          </div>
          <PhaseStepper current={phase} />
        </div>

        {phase === "free_pitch" && (
          <FreePitchView
            sessionId={id}
            analyze={(c) => analyze({ data: { session_id: id, content: c } })}
            onFinish={async (content, duration) => {
              await transition({ data: { session_id: id, free_pitch_content: content, duration_seconds: duration } });
              await refetch();
            }}
          />
        )}

        {phase === "discussion" && (
          <DiscussionView
            agents={data.agents}
            messages={data.messages}
            onSend={async (c) => { await sendMsg({ data: { session_id: id, content: c } }); await refetch(); }}
            onDebrief={async () => {
              toast.info("Génération du débrief…");
              await runDebrief({ data: { session_id: id } });
              await refetch();
            }}
          />
        )}

        {phase === "debrief" && (
          <DebriefView
            agents={data.agents}
            messages={data.messages}
            onReport={() => navigate({ to: "/report/$id", params: { id } })}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ---------------- Phase stepper ---------------- */

function PhaseStepper({ current }: { current: string }) {
  const phases = [
    { key: "free_pitch", label: "Pitch libre" },
    { key: "discussion", label: "Discussion" },
    { key: "debrief", label: "Débrief" },
  ];
  return (
    <div className="flex gap-2">
      {phases.map((p, i) => {
        const active = p.key === current;
        return (
          <div key={p.key}
            className={`postit ${i % 2 === 0 ? "tilt-neg-1" : "tilt-1"}`}
            style={{
              backgroundColor: active ? "var(--violet-pitch-soft)" : "var(--postit)",
              fontWeight: active ? 700 : 400,
              fontSize: "0.85rem", padding: "0.4rem 0.7rem",
            }}>
            {i + 1}. {p.label}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Free pitch ---------------- */

function FreePitchView({
  analyze,
  onFinish,
}: {
  sessionId: string;
  analyze: (content: string) => Promise<{ covered: string[]; missing_advice: string }>;
  onFinish: (content: string, duration: number) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [covered, setCovered] = useState<string[]>([]);
  const [advice, setAdvice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (content.trim().length < 80) return;
    // Skip auto-analyse si pitch trop long (le LLM se met à ramer et bloque le worker)
    if (content.length > 6000) return;
    debounceRef.current = setTimeout(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const r = await analyze(content);
        setCovered(r.covered);
        setAdvice(r.missing_advice);
      } catch { /* ignore */ }
      finally { inFlightRef.current = false; }
    }, 6000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content, analyze]);

  async function handleFinish() {
    if (!content.trim()) { toast.error("Pitch vide"); return; }
    // Annule toute analyse en attente pour libérer le worker
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    setSubmitting(true);
    try {
      await onFinish(content.trim(), elapsed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur transition");
      setSubmitting(false);
    }
  }

  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-5">
      <div className="card-sketch-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="font-hand text-xl">À vous. Pitchez votre projet.</p>
          <span className="font-mono text-sm postit" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
            ⏱ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          placeholder="Bonjour, je suis... Notre projet résout..."
          className="paper-bg font-sketch text-lg leading-7 resize-none border-[1.5px] border-ink"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleFinish} disabled={submitting} size="lg"
            className="font-hand text-lg border-[1.5px] border-ink shadow-[var(--shadow-sketch-lg)]"
            style={{ backgroundColor: "var(--violet-pitch)", color: "white" }}>
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transition…</>) : "J'ai fini →"}
          </Button>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="card-sketch">
          <p className="font-hand text-lg font-bold">Coach</p>
          <p className="text-xs text-ink-soft mb-2">Sujets à couvrir</p>
          <ul className="space-y-1">
            {ALL_TOPICS.map((t) => {
              const ok = covered.includes(t);
              return (
                <li key={t} className={`text-sm font-sketch flex items-center gap-2 transition ${ok ? "" : "opacity-60"}`}>
                  <span className="inline-block w-5">{ok ? "✅" : "○"}</span>
                  {TOPIC_LABELS[t]}
                </li>
              );
            })}
          </ul>
        </div>
        {advice && (
          <div className="postit-pink tilt-1 font-sketch text-sm">
            💡 {advice}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------------- Discussion ---------------- */

function DiscussionView({
  agents, messages, onSend, onDebrief,
}: {
  agents: SimAgent[];
  messages: SimMessage[];
  onSend: (content: string) => Promise<void>;
  onDebrief: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const c = draft.trim();
    setDraft("");
    setSending(true);
    try { await onSend(c); } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setSending(false); }
  }

  const discussionMsgs = messages.filter((m) => m.sender_type !== "free_pitch" && !m.sender_type?.startsWith("debrief_"));

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="card-sketch-lg flex flex-col h-[65vh]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {discussionMsgs.length === 0 && (
            <p className="font-sketch text-ink-soft text-center mt-10">
              Le panel a écouté votre pitch. Lancez la discussion ou attendez leur première question.
            </p>
          )}
          {discussionMsgs.map((m) => <Bubble key={m.id} m={m} agents={agents} />)}
          {sending && (
            <div className="font-sketch text-sm text-ink-soft italic">Les investisseurs réfléchissent…</div>
          )}
        </div>
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Répondez ou relancez la discussion…"
            className="border-[1.5px] border-ink"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
          />
          <Button type="submit" disabled={sending || !draft.trim()}
            className="self-stretch border-[1.5px] border-ink"
            style={{ backgroundColor: "var(--violet-pitch)", color: "white" }}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <aside className="space-y-3">
        <div className="card-sketch">
          <p className="font-hand text-lg font-bold">Le panel</p>
          <div className="space-y-2 mt-2">
            {agents.map((a) => (
              <div key={a.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-sketch font-bold">{a.name}</span>
                  <span className="text-xs">{a.commitment_status ?? "neutral"}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-1 border border-ink/30">
                  <div className="h-full gradient-conviction transition-all"
                    style={{ width: `${Math.round(Number(a.conviction) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onDebrief} variant="outline"
          className="w-full font-hand border-[1.5px] border-ink">
          Clore et débriefer →
        </Button>
      </aside>
    </div>
  );
}

function Bubble({ m, agents }: { m: SimMessage; agents: SimAgent[] }) {
  const agent = agents.find((a) => a.id === m.agent_id);
  const isUser = m.sender === "user";
  const isOffer = m.sender_type === "offer";
  const isDD = m.sender_type === "dd_question";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] postit-blue tilt-neg-1 font-sketch text-base">
          {m.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className="shrink-0 w-9 h-9 rounded-full border-[1.5px] border-ink flex items-center justify-center font-hand text-sm font-bold"
        style={{ backgroundColor: "var(--violet-pitch-soft)" }}
      >
        {agent?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
      <div className="max-w-[80%]">
        <div className="text-xs font-sketch text-ink-soft">
          {agent?.name} {isOffer && "· 💰 offre"} {isDD && "· 🔍 DD"}
        </div>
        <div className="card-sketch mt-1" style={{
          padding: "0.6rem 0.85rem",
          borderColor: isOffer ? "var(--violet-pitch)" : undefined,
          borderWidth: isOffer ? 2 : undefined,
        }}>
          <p className="text-base leading-snug">{m.content}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Debrief ---------------- */

function DebriefView({
  agents, messages, onReport,
}: {
  agents: SimAgent[];
  messages: SimMessage[];
  onReport: () => void;
}) {
  const debriefMsgs = messages.filter((m) => m.sender_type?.startsWith("debrief_"));

  return (
    <div className="space-y-4">
      <div className="card-sketch-lg" style={{ backgroundColor: "var(--violet-pitch-soft)" }}>
        <span className="badge-stamp">Verdicts</span>
        <p className="font-hand text-xl mt-2">
          Le panel a délibéré. Voici ce qu'ils ont retenu.
        </p>
      </div>

      <div className="space-y-3">
        {debriefMsgs.map((m, i) => {
          const agent = agents.find((a) => a.id === m.agent_id);
          const verdict = m.sender_type?.replace("debrief_", "");
          const bg = verdict === "in" ? "var(--postit)"
                   : verdict === "out" ? "var(--postit-pink)"
                   : "var(--postit-blue)";
          return (
            <div key={m.id} className={`card-sketch ${i % 2 === 0 ? "tilt-neg-1" : "tilt-1"}`}
              style={{ backgroundColor: bg }}>
              <div className="flex items-center justify-between">
                <span className="font-hand text-lg font-bold">{agent?.name}</span>
                <span className="badge-stamp" style={{
                  borderColor: verdict === "in" ? "oklch(0.55 0.16 150)"
                             : verdict === "out" ? "var(--destructive)" : undefined,
                  color: verdict === "in" ? "oklch(0.45 0.16 150)"
                       : verdict === "out" ? "var(--destructive)" : undefined,
                }}>
                  {verdict === "in" ? "IN" : verdict === "out" ? "OUT" : "WATCHING"}
                </span>
              </div>
              <p className="font-sketch mt-2 leading-snug">{m.content}</p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onReport} size="lg"
          className="font-hand text-lg border-[1.5px] border-ink shadow-[var(--shadow-sketch-lg)]"
          style={{ backgroundColor: "var(--violet-pitch)", color: "white" }}>
          Voir le rapport complet →
        </Button>
      </div>
    </div>
  );
}