import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Swords, TrendingUp, Store, Flame, Loader2 } from "lucide-react";
import { createSession } from "@/lib/session.functions";
import { getLatestPitchContext } from "@/lib/pitch-bridge.functions";
import { buildPlaceholderContext } from "@/lib/adapters/negociation";
import { SketchAvatar } from "@/components/nego/SketchAvatar";
import { QuitButton } from "@/components/nego/QuitButton";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/formation-negociation/setup")({
  component: NegoSetup,
});

const SKILLS = [
  { id: "negociation_b2b", label: "Négociation B2B", icon: Swords, active: true },
  { id: "pitch", label: "Pitch", icon: TrendingUp, active: false },
  { id: "vente_b2c", label: "Vente B2C", icon: Store, active: false },
  { id: "crise", label: "Gestion de crise", icon: Flame, active: false },
];

function NegoSetup() {
  const navigate = useNavigate();
  const create = useServerFn(createSession);
  const fetchPitch = useServerFn(getLatestPitchContext);
  const [clients, setClients] = useState(3);
  const [experts, setExperts] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<{
    source_session_id: string;
    product_context: {
      product: string;
      target_customer: string;
      price: string;
      value_proposition: string;
      expected_objection: string;
      goal: string;
      batna: string;
    };
    pitch_summary: { product: string; problem: string; traction: string; team: string; ask: string };
  } | null>(null);
  const total = clients + experts;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await fetchPitch()) as Awaited<ReturnType<typeof fetchPitch>>;
        if (cancelled || !res) return;
        setPitch(res as never);
      } catch {
        // pas de pitch précédent, on ignore
      }
    })();
    return () => { cancelled = true; };
  }, [fetchPitch]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const base = buildPlaceholderContext({ clients, experts });
      const inherited = pitch?.product_context;
      const product_context = {
        ...base,
        ...(inherited ?? {}),
        product: inherited?.product || base.product,
        goal: inherited?.goal || base.goal,
        target_customer:
          inherited?.target_customer
            ? `${inherited.target_customer} — ${base.target_customer}`
            : base.target_customer,
      };
      const { session_id } = await create({ data: { game_mode: "libre", product_context } });
      navigate({ to: "/formation-negociation/personas", search: { id: session_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de création");
      setLoading(false);
    }
  }

  return (
    <div className="nego-bg min-h-screen page-fade" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="handwritten" style={{ fontSize: "2.5rem", color: "var(--ink)" }}>Création de communauté</h1>
        <p className="mt-1" style={{ color: "#6B7280" }}>Configure ta simulation de négociation B2B.</p>

        {/* Section A — Skill */}
        <section className="mt-8">
          <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>Que veux-tu travailler ?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              const selected = s.active;
              return (
                <div
                  key={s.id}
                  className="sketch-card-soft"
                  style={{
                    opacity: s.active ? 1 : 0.5,
                    cursor: s.active ? "pointer" : "not-allowed",
                    border: selected ? "2px solid var(--marker-teal)" : "1.5px solid var(--ink)",
                    textAlign: "center",
                    padding: "1rem 0.5rem",
                  }}
                >
                  <Icon size={28} color={selected ? "var(--marker-teal)" : "var(--ink)"} className="mx-auto" />
                  <p className="handwritten mt-2" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section B — Comité */}
        <section className="mt-10">
          <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>Compose ton comité</h2>

          <div className="mt-4 space-y-5">
            <div>
              <label className="handwritten block" style={{ fontSize: "1.3rem", color: "var(--marker-teal)" }}>
                {clients} client·s potentiel·s
              </label>
              <input
                type="range" min={1} max={10} value={clients}
                onChange={(e) => setClients(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--marker-teal)" }}
              />
            </div>
            <div>
              <label className="handwritten block" style={{ fontSize: "1.3rem", color: "var(--marker-teal)" }}>
                {experts} expert·s métier
              </label>
              <input
                type="range" min={0} max={5} value={experts}
                onChange={(e) => setExperts(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--marker-teal)" }}
              />
            </div>
          </div>

          <div className="sketch-card-soft mt-6" style={{ background: "#FFFBEB" }}>
            <p className="handwritten" style={{ fontSize: "1.3rem", color: "var(--ink)" }}>
              Votre comité&nbsp;: {total} personne{total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
                <SketchAvatar key={i} id={`preview-${i}`} conviction={0.5} size={40} />
              ))}
              {total > 6 && (
                <span className="handwritten" style={{ fontSize: "1.2rem", color: "#6B7280" }}>+{total - 6}</span>
              )}
            </div>
          </div>
        </section>

        {/* Section C — CTA */}
        <section className="mt-10">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="sketch-btn sketch-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ color: "var(--ink)" }}>Création de votre comité…</span>
              </>
            ) : (
              <span style={{ color: "var(--ink)" }}>Générer le comité</span>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}