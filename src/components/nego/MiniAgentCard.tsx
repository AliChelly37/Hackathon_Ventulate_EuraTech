import { SketchAvatar } from "./SketchAvatar";
import { Thermometer } from "./Thermometer";
import { LeftTableEffect } from "./LeftTableEffect";
import { stateColor, type UiAgent } from "@/lib/adapters/negociation";

export function MiniAgentCard({ agent }: { agent: UiAgent }) {
  const pct = Math.round(agent.conviction * 100);
  const color = stateColor(agent.conviction);
  return (
    <LeftTableEffect active={agent.has_left}>
      <div className="sketch-card-soft" style={{ padding: "0.75rem" }}>
      <div className="flex gap-3 items-center">
        <SketchAvatar id={agent.id} conviction={agent.conviction} size={56} />
        <Thermometer conviction={agent.conviction} />
        <div className="flex-1 min-w-0">
          <p className="handwritten truncate" style={{ fontSize: "1.05rem", color: "var(--ink)" }}>{agent.name}</p>
          <p className="truncate" style={{ fontSize: 11, color: "#6B7280" }}>{agent.role}</p>
          <p className="handwritten tabular-nums" style={{ fontSize: "1.1rem", color }}>{pct}%</p>
          <div className="mt-1" style={{ height: 4, background: "#F3F4F6", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: `${Math.round(agent.weight * 100)}%`, background: "var(--ink)" }} />
          </div>
          <p style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>Poids&nbsp;: {Math.round(agent.weight * 100)}%</p>
        </div>
      </div>
      </div>
    </LeftTableEffect>
  );
}