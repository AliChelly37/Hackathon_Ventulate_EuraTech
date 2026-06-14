import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wand2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { QuitButton } from "@/components/nego/QuitButton";
import { generateB2BSetupDemo, createB2BSession } from "@/lib/b2b.functions";

export const Route = createFileRoute("/_authenticated/formation-b2b/setup")({
  component: B2BSetup,
});

function B2BSetup() {
  const navigate = useNavigate();
  const genDemo = useServerFn(generateB2BSetupDemo);
  const create = useServerFn(createB2BSession);

  const [demo, setDemo] = useState({ product: "", price_per_seat: "", seats: "" });
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [demoLoading, setDemoLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await genDemo({});
        setDemo(d);
      } catch {
        setDemo({ product: "Plateforme RevOps pour équipes commerciales B2B", price_per_seat: "59 €", seats: "20" });
      } finally {
        setDemoLoading(false);
      }
    })();
  }, [genDemo]);

  async function start() {
    const p = product.trim() || demo.product;
    const pr = price.trim() || demo.price_per_seat;
    const s = seats.trim() || demo.seats;
    setLoading(true);
    try {
      const { session_id } = await create({ data: { product: p, price_per_seat: pr, seats: s } });
      navigate({ to: "/formation-b2b/simulation", search: { id: session_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur création");
      setLoading(false);
    }
  }

  return (
    <div className="nego-bg min-h-screen page-fade" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7" style={{ color: "var(--marker-teal)" }} />
          <h1 className="handwritten" style={{ fontSize: "2.4rem", color: "var(--ink)" }}>
            Carnet de vente B2B
          </h1>
        </div>
        <p className="mt-1" style={{ color: "#6B7280" }}>
          Trois informations suffisent. L'IA pré-remplit en gris pour la démo.
        </p>

        <section className="sketch-card-soft paper-bg mt-6" style={{ borderColor: "#2D2D2D" }}>
          <div className="flex items-center justify-between">
            <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
              Le deal
            </h2>
            {demoLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {!demoLoading && (
              <span className="handwritten flex items-center gap-1" style={{ fontSize: "1rem", color: "var(--marker-violet)" }}>
                <Wand2 size={14} /> pré-rempli par l'IA
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <label className="block">
              <span className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>Produit</span>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder={demoLoading ? "L'IA prépare un exemple…" : demo.product}
                className="text-gray-400 focus:text-[color:var(--ink)]"
                style={{
                  width: "100%", marginTop: 4,
                  background: "var(--paper)", border: "1.5px solid var(--ink)",
                  borderRadius: "var(--sketch-radius-soft)", padding: "0.6rem 0.9rem",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>Prix / siège</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={demoLoading ? "—" : demo.price_per_seat}
                  className="text-gray-400 focus:text-[color:var(--ink)]"
                  style={{
                    width: "100%", marginTop: 4,
                    background: "var(--paper)", border: "1.5px solid var(--ink)",
                    borderRadius: "var(--sketch-radius-soft)", padding: "0.6rem 0.9rem",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                />
              </label>
              <label className="block">
                <span className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>Sièges</span>
                <input
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  placeholder={demoLoading ? "—" : demo.seats}
                  className="text-gray-400 focus:text-[color:var(--ink)]"
                  style={{
                    width: "100%", marginTop: 4,
                    background: "var(--paper)", border: "1.5px solid var(--ink)",
                    borderRadius: "var(--sketch-radius-soft)", padding: "0.6rem 0.9rem",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <button
            onClick={start}
            disabled={loading || demoLoading}
            className="sketch-btn sketch-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> <span style={{ color: "var(--ink)" }}>Préparation du comité…</span></>
            ) : (
              <span style={{ color: "var(--ink)" }}>Lancer la simulation B2B</span>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}