import { Users, Lightbulb } from "lucide-react";
import { SketchAvatar } from "./SketchAvatar";
import type { UiAgent, UiMessage } from "@/lib/adapters/negociation";

export function ChatBubble({ m, agents }: { m: UiMessage; agents: UiAgent[] }) {
  if (m.sender_type === "user") {
    return (
      <div className="flex justify-end">
        <div
          style={{
            maxWidth: "75%",
            background: "#CCFBF180",
            border: "1.5px solid var(--marker-teal)",
            borderRadius: "18px 4px 18px 18px",
            padding: "0.6rem 0.9rem",
            color: "var(--ink)",
          }}
        >
          {m.content}
        </div>
      </div>
    );
  }
  if (m.sender_type === "system") {
    const left = m.content.toLowerCase().includes("quitt");
    return (
      <p
        className="text-center italic"
        style={{ fontSize: 12, color: left ? "var(--marker-red)" : "#6B7280" }}
      >
        {m.content}
      </p>
    );
  }
  if (m.sender_type === "coalition") {
    return (
      <div
        style={{
          background: "#FEF3C733",
          border: "2.5px double var(--marker-amber)",
          borderRadius: 12,
          padding: "0.6rem 0.9rem",
        }}
      >
        <p className="handwritten flex items-center gap-1" style={{ color: "var(--marker-amber)", fontSize: "1.05rem" }}>
          <Users size={14} /> Coalition
        </p>
        <p style={{ marginTop: 4, color: "var(--ink)" }}>{m.content}</p>
      </div>
    );
  }
  if (m.sender_type === "whisper") {
    return (
      <div
        className="mx-auto"
        style={{
          maxWidth: "70%",
          background: "#F5F3FF",
          border: "1.5px dashed var(--marker-violet)",
          borderRadius: 12,
          padding: "0.6rem 0.9rem",
        }}
      >
        <p className="handwritten flex items-center gap-1" style={{ color: "var(--marker-violet)", fontSize: "1.05rem" }}>
          <Lightbulb size={14} /> Indice
        </p>
        <p style={{ marginTop: 4, color: "var(--ink)" }}>{m.content}</p>
      </div>
    );
  }
  // agent
  const agent = agents.find((a) => a.id === m.agent_id);
  const addressed = agents.find((a) => a.id === m.addressed_to);
  return (
    <div className="flex items-start gap-2">
      {agent && <SketchAvatar id={agent.id} conviction={agent.conviction} size={40} />}
      <div style={{ maxWidth: "75%" }}>
        <p className="handwritten" style={{ fontSize: "1rem", color: "var(--marker-teal)" }}>
          {agent?.name ?? "Agent"}
          {addressed && <span style={{ color: "#6B7280" }}> → {addressed.name}</span>}
        </p>
        <div
          style={{
            background: "var(--paper)",
            border: "1.5px solid var(--ink)",
            borderRadius: "4px 18px 18px 18px",
            padding: "0.6rem 0.9rem",
            boxShadow: "1px 2px 0 rgba(0,0,0,0.05)",
            color: "var(--ink)",
          }}
        >
          {m.content}
        </div>
      </div>
    </div>
  );
}