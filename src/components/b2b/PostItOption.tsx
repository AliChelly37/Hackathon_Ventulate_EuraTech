/**
 * Post-it cliquable pour la phase "Act" du simulateur B2B.
 */
export function PostItOption({
  text,
  index,
  selected,
  disabled,
  onClick,
}: {
  text: string;
  index: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tilts = ["-2deg", "1.5deg", "-1deg"];
  const colors = ["#FEF3C7", "#FDE68A", "#FFE4E6"];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="postit text-left"
      style={{
        backgroundColor: colors[index % colors.length],
        transform: `rotate(${tilts[index % tilts.length]})`,
        border: selected ? "2px solid var(--marker-teal)" : "1.5px solid var(--ink)",
        boxShadow: "3px 3px 0 rgba(0,0,0,0.08)",
        padding: "0.9rem 1rem",
        fontSize: "1rem",
        lineHeight: 1.35,
        width: "100%",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !selected ? 0.6 : 1,
        transition: "transform 200ms ease, box-shadow 200ms ease",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "var(--ink)",
      }}
    >
      <span className="handwritten block mb-1" style={{ fontSize: "1rem", color: "var(--marker-teal)" }}>
        Option {index + 1}
      </span>
      {text}
    </button>
  );
}