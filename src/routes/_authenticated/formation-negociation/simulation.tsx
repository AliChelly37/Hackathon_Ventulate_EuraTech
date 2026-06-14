import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Send, Check, X, Lightbulb, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendUserMessage } from "@/lib/session.functions";
import {
  mapAgentsToUI,
  mapMessagesToUI,
  computeTCG,
  detectStagnation,
  type UiAgent,
  type UiMessage,
} from "@/lib/adapters/negociation";
import { TCGBar } from "@/components/nego/TCGBar";
import { ChatBubble } from "@/components/nego/ChatBubble";
import { MiniAgentCard } from "@/components/nego/MiniAgentCard";
import { QuitButton } from "@/components/nego/QuitButton";
import { BackButton } from "@/components/BackButton";

const search = z.object({ id: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/_authenticated/formation-negociation/simulation")({
  validateSearch: zodValidator(search),
  component: SimulationPage,
});

interface SessionRow { id: string; status: string; current_turn: number; }

function SimulationPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const send = useServerFn(sendUserMessage);

  const [agents, setAgents] = useState<UiAgent[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [whisperUsed, setWhisperUsed] = useState(false);
  const [tcgHistory, setTcgHistory] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (!id) return;
    const [{ data: s }, { data: a }, { data: m }] = await Promise.all([
      supabase.from("sessions").select("id,status,current_turn").eq("id", id).single(),
      supabase.from("agents").select("*").eq("session_id", id).order("order_index"),
      supabase.from("messages").select("*").eq("session_id", id).order("created_at"),
    ]);
    if (s) setSession(s as unknown as SessionRow);
    if (a) {
      const ui = mapAgentsToUI(a as never);
      setAgents(ui);
      const t = computeTCG(ui);
      setTcgHistory((h) => (h[h.length - 1] === t ? h : [...h, t].slice(-20)));
    }
    if (m) setMessages(mapMessagesToUI(m as never));
  }

  useEffect(() => { refresh(); }, [id]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const tcg = computeTCG(agents);
  const stagnating = detectStagnation(tcgHistory);
  const concluded = session?.status === "won" || session?.status === "lost";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending || concluded) return;
    const content = draft.trim();
    setDraft("");
    setSending(true);
    setMessages((m) => [...m, {
      id: `tmp-${Date.now()}`, sender_type: "user", agent_id: null,
      addressed_to: null, content, created_at: new Date().toISOString(),
    }]);
    try {
      await send({ data: { session_id: id, content } });
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function concludeSession(outcome: "won" | "lost") {
    if (!concluded) {
      await supabase.from("sessions").update({ status: outcome }).eq("id", id);
    }
    navigate({ to: "/formation-negociation/report", search: { id } });
  }

  function handleQuit() {
    if (window.confirm("Quitter et terminer la simulation ?")) {
      void concludeSession(tcg >= 70 ? "won" : "lost");
    }
  }

  function handleConclude() {
    void concludeSession(tcg >= 70 ? "won" : "lost");
  }

  function handleWhisper() {
    setWhisperUsed(true);
    setMessages((m) => [
      ...m,
      {
        id: `whisper-${Date.now()}`,
        sender_type: "whisper",
        agent_id: null,
        addressed_to: null,
        content: "Reformule l'objection principale du Décideur et propose un compromis concret avant qu'il ne se ferme.",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  function suggestDemoReply() {
    const decideur = [...agents].sort((a, b) => b.weight - a.weight)[0];
    const cible = decideur?.name ? decideur.name.split(" ")[0] : "vous";
    const suggestion = `${cible}, j'entends votre préoccupation sur le risque. Je propose un pilote de 8 semaines, sans engagement long terme, avec un point hebdomadaire et une clause de sortie. Si nous n'atteignons pas les jalons fixés ensemble, vous ne payez rien au-delà du setup.`;
    setDraft(suggestion);
  }

  return (
    <div className="nego-bg" style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />
      {/* Colonne gauche 70% */}
      <div style={{ width: "70%", borderRight: "1.5px solid var(--ink)", display: "flex", flexDirection: "column" }}>
        {/* Header TCG */}
        <header className="border-b px-6 py-3 flex items-center gap-4" style={{ borderColor: "var(--ink)" }}>
          <TCGBar value={tcg} />
          <span className="handwritten tabular-nums" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>{tcg}%</span>
          <button
            onClick={handleConclude}
            disabled={tcg < 70 || concluded}
            className="sketch-btn"
            style={{
              background: tcg >= 70 ? "var(--marker-green)" : "#E5E7EB",
              color: "var(--ink)",
              opacity: tcg < 70 ? 0.5 : 1,
              animation: tcg >= 70 ? "nego-pulse 1.6s infinite" : undefined,
              padding: "0.4rem 0.9rem",
              fontSize: "1.1rem",
            }}
          >
            <Check size={16} /> Conclure
          </button>
          <button
            onClick={handleQuit}
            className="sketch-btn sketch-btn-red"
            style={{ padding: "0.4rem 0.9rem", fontSize: "1.1rem" }}
          >
            <X size={16} /> Quitter
          </button>
        </header>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {messages.map((m) => <ChatBubble key={m.id} m={m} agents={agents} />)}
            {sending && (
              <div className="flex items-center gap-2" style={{ color: "var(--marker-teal)" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="handwritten" style={{ fontSize: "1.1rem" }}>Le comité réfléchit…</span>
              </div>
            )}
          </div>
        </div>

        {/* Input footer */}
        <form onSubmit={handleSend} className="border-t px-6 py-4" style={{ borderColor: "var(--ink)" }}>
          {stagnating && !whisperUsed && !concluded && (
            <button
              type="button"
              onClick={handleWhisper}
              className="mb-2 handwritten inline-flex items-center gap-1"
              style={{
                fontSize: "1rem",
                padding: "0.25rem 0.75rem",
                borderRadius: 999,
                border: "1.5px dashed var(--marker-violet)",
                background: "#F5F3FF",
                color: "var(--marker-violet)",
                cursor: "pointer",
              }}
            >
              <Lightbulb size={14} /> Demander un indice
            </button>
          )}
          <div className="mb-2">
            <button
              type="button"
              onClick={suggestDemoReply}
              disabled={concluded || agents.length === 0}
              className="sketch-btn"
              style={{ padding: "0.3rem 0.8rem", fontSize: "1rem" }}
            >
              <Wand2 size={14} /> <span style={{ color: "var(--ink)" }}>Suggérer une réponse IA (Démo)</span>
            </button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              rows={2}
              placeholder="Tapez votre argument ici…"
              disabled={concluded}
              className="placeholder:text-gray-400"
              style={{
                flex: 1,
                background:
                  "repeating-linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 23px, #D8D4CC 23px, #D8D4CC 24px)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--sketch-radius-soft)",
                padding: "0.6rem 0.9rem",
                fontFamily: "Inter, system-ui, sans-serif",
                color: "var(--ink)",
                resize: "none",
              }}
            />
            <div className="flex flex-col items-center gap-1">
              <button
                type="submit"
                disabled={!draft.trim() || sending || concluded}
                className="sketch-btn sketch-btn-primary"
                style={{ padding: "0.5rem 0.8rem" }}
              >
                <Send size={18} />
              </button>
              <span className="handwritten" style={{ fontSize: "0.9rem", color: "#6B7280" }}>
                Tour {session?.current_turn ?? 0}
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Colonne droite 30% */}
      <aside style={{ width: "30%", overflowY: "auto", padding: "1.25rem" }}>
        <h2 className="handwritten" style={{ fontSize: "1.7rem", color: "var(--ink)" }}>Le comité</h2>
        <div className="mt-4 space-y-3">
          {agents.map((a) => <MiniAgentCard key={a.id} agent={a} />)}
        </div>
      </aside>
    </div>
  );
}