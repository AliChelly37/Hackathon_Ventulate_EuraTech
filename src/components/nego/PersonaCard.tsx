import { Target, Lightbulb, User } from "lucide-react";
import { SketchAvatar } from "./SketchAvatar";
import { tierMeta, type UiAgent } from "@/lib/adapters/negociation";

export function PersonaCard({ agent, tilt = 0 }: { agent: UiAgent; tilt?: number }) {
  const meta = tierMeta(agent.tier);
  const Icon = agent.tier === 3 ? Target : agent.tier === 2 ? Lightbulb : User;
  return (
    <div
      className="sketch-card-soft"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="flex items-start gap-3">
        <SketchAvatar id={agent.id} conviction={agent.conviction} size={64} />
        <div className="flex-1 min-w-0">
          <h3 className="handwritten" style={{ fontSize: "1.5rem", color: "var(--ink)", lineHeight: 1.1 }}>{agent.name}</h3>
          <p style={{ fontSize: 12, color: "#6B7280" }}>{agent.role}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 handwritten"
          style={{
            fontSize: "1rem",
            padding: "0.15rem 0.6rem",
            border: `1.5px solid ${meta.color}`,
            color: meta.color,
            borderRadius: 999,
          }}
        >
          <Icon size={14} /> {meta.label}
        </span>
      </div>

      {(agent.positive_traits.length > 0 || agent.critical_traits.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.positive_traits.map((t, i) => (
            <span key={`p${i}`} style={{ fontSize: 11, padding: "0.1rem 0.5rem", borderRadius: 999, background: "#D1FAE5", color: "#065F46", border: "1px solid #10B98140" }}>{t}</span>
          ))}
          {agent.critical_traits.map((t, i) => (
            <span key={`c${i}`} style={{ fontSize: 11, padding: "0.1rem 0.5rem", borderRadius: 999, background: "#FEE2E2", color: "#991B1B", border: "1px solid #EF444440" }}>{t}</span>
          ))}
        </div>
      )}

      {agent.initial_comment && (
        <blockquote
          className="handwritten mt-3"
          style={{
            background: "#FEF9C3",
            border: "1px solid #FDE68A",
            borderRadius: "8px 2px 10px 4px / 4px 10px 2px 8px",
            padding: "0.5rem 0.75rem",
            fontSize: "1.05rem",
            color: "var(--ink)",
          }}
        >
          «&nbsp;{agent.initial_comment}&nbsp;»
        </blockquote>
      )}
    </div>
  );
}