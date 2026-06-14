import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ConvictionGauge } from "@/components/ConvictionGauge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sendUserMessage } from "@/lib/session.functions";
import { computeConviction, type AgentState } from "@/lib/conviction";
import { Loader2, Send, Trophy, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play/$id")({ component: PlayPage });

interface AgentRow { id: string; name: string; role: string; weight: number; conviction: number; order_index: number; }
interface MessageRow { id: string; sender: string; agent_id: string | null; addressed_to: string | null; content: string; created_at: string; }
interface SessionRow { id: string; game_mode: "chrono" | "libre"; turn_limit: number; current_turn: number; status: "intake" | "playing" | "won" | "lost"; }

function PlayPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const send = useServerFn(sendUserMessage);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const [{ data: s }, { data: a }, { data: m }] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).single(),
      supabase.from("agents").select("*").eq("session_id", id).order("order_index"),
      supabase.from("messages").select("*").eq("session_id", id).order("created_at"),
    ]);
    if (s) setSession(s as unknown as SessionRow);
    if (a) setAgents((a as unknown as AgentRow[]).map((x) => ({ ...x, weight: Number(x.weight), conviction: Number(x.conviction) })));
    if (m) setMessages(m as unknown as MessageRow[]);
  }

  useEffect(() => { refresh(); }, [id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const content = draft.trim();
    setDraft("");
    setSending(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender: "user", agent_id: null, addressed_to: null, content, created_at: new Date().toISOString() }]);
    try { await send({ data: { session_id: id, content } }); await refresh(); }
    catch (err) { console.error(err); }
    finally { setSending(false); }
  }

  const states: AgentState[] = agents.map((a) => ({ id: a.id, weight: a.weight, conviction: a.conviction }));
  const result = computeConviction(states);
  const turnsLeft = session?.game_mode === "chrono" && session ? Math.max(0, session.turn_limit - session.current_turn) : null;
  const ended = session?.status === "won" || session?.status === "lost";

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col h-[calc(100vh-180px)] rounded-3xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <ConvictionGauge value={result.T} capped={result.capped} turnsLeft={turnsLeft} />
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m) => <MessageBubble key={m.id} m={m} agents={agents} />)}
            {sending && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Les interlocuteurs réfléchissent…</div>)}
          </div>
          {ended && session ? (
            <div className="border-t p-5 flex items-center justify-between bg-secondary/50">
              <div className="flex items-center gap-3">
                {session.status === "won"
                  ? <Trophy className="h-6 w-6" style={{ color: "var(--color-conviction-80)" }} />
                  : <XCircle className="h-6 w-6" style={{ color: "var(--color-conviction-0)" }} />}
                <p className="font-medium">{session.status === "won" ? "Vous les avez convaincus 🎉" : "La table n'est pas convaincue."}</p>
              </div>
              <Button onClick={() => navigate({ to: "/report/$id", params: { id } })} className="rounded-full">Voir le débrief</Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="border-t p-4 flex gap-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Votre prochain argument…" className="min-h-12 max-h-40 rounded-2xl resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); } }} />
              <Button type="submit" disabled={!draft.trim() || sending} className="rounded-full" size="lg"><Send className="h-4 w-4" /></Button>
            </form>
          )}
        </div>
        <aside className="rounded-3xl border bg-card p-5 h-fit space-y-4">
          <h2 className="font-semibold">La table ({agents.length})</h2>
          {agents.map((a) => (
            <div key={a.id} className="flex items-center gap-3">
              <AgentAvatar name={a.name} conviction={a.conviction} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground truncate">{a.role}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Poids {(a.weight * 100).toFixed(0)}%</span><span>·</span><span className="tabular-nums">{(a.conviction * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </AppShell>
  );
}

function MessageBubble({ m, agents }: { m: MessageRow; agents: AgentRow[] }) {
  if (m.sender === "system") return <p className="text-center text-xs text-muted-foreground italic">{m.content}</p>;
  if (m.sender === "user") {
    return (<div className="flex justify-end"><div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2">{m.content}</div></div>);
  }
  const agent = agents.find((a) => a.id === m.agent_id);
  const addressedAgent = agents.find((a) => a.id === m.addressed_to);
  return (
    <div className="flex items-start gap-2">
      {agent && <AgentAvatar name={agent.name} conviction={agent.conviction} size="sm" />}
      <div className="max-w-[75%]">
        <p className="text-xs text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{agent?.name ?? "Agent"}</span>
          {addressedAgent && <> → <span className="font-medium">{addressedAgent.name}</span></>}
        </p>
        <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-2">{m.content}</div>
      </div>
    </div>
  );
}