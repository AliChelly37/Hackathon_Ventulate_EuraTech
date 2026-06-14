import { useEffect, useRef, useState } from "react";

interface Props { value: number; }

export function TCGBar({ value }: Props) {
  const prev = useRef(value);
  const [confetti, setConfetti] = useState(false);
  const goingDown = value < prev.current;

  useEffect(() => {
    if (prev.current < 70 && value >= 70) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2000);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  const color =
    value < 40 ? "var(--marker-red)"
    : value < 70 ? "var(--marker-amber)"
    : "var(--marker-green)";

  const shake = value < 30;
  const confettiColors = ["var(--marker-teal)", "var(--marker-amber)", "var(--marker-green)", "var(--marker-rose)", "var(--marker-violet)"];

  return (
    <div className="relative flex-1">
      <div
        style={{
          position: "relative",
          height: 16,
          width: "100%",
          background: "var(--paper)",
          border: "1.5px solid var(--ink)",
          borderRadius: 999,
          overflow: "hidden",
          animation: shake ? "tcg-shake 0.4s infinite" : undefined,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color,
            borderRadius: 999,
            transition: "width 0.8s cubic-bezier(.3,.7,.3,1), background-color 0.6s ease",
            filter: goingDown ? "blur(0.5px)" : "blur(0)",
            transform: goingDown ? "scaleY(0.8)" : "scaleY(1)",
            transformOrigin: "bottom",
          }}
        />
      </div>
      {confetti && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
          {confettiColors.map((c, i) => (
            <svg
              key={i}
              width={14}
              height={14}
              viewBox="0 0 24 24"
              style={{
                position: "absolute",
                top: -8,
                left: `${15 + i * 17}%`,
                color: c,
                animation: `confetti-fall 2s ease-out ${i * 0.1}s forwards`,
              }}
            >
              <polygon
                points="12,2 15,9 22,9 16,14 19,22 12,17 5,22 8,14 2,9 9,9"
                fill="currentColor"
              />
            </svg>
          ))}
        </div>
      )}
    </div>
  );
}