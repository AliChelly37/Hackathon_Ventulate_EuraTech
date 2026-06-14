import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wand2, Scale, AlertTriangle, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { QuitButton } from "@/components/nego/QuitButton";
import { SketchAvatar } from "@/components/nego/SketchAvatar";
import {
  generateLaboSetupDemo,
  generateLaboScene,
  generateLaboPlaceholder,
  type LaboCounterpart,
  type LaboScene,
  type LaboSetup,
} from "@/lib/labo-prix.functions";

export const Route = createFileRoute("/_authenticated/formation-b2b/labo-prix")({
  component: LaboPrixPage,
});

type Step = "setup" | "balance" | "verdict";
type Verdict = "win" | "fail";

function LaboPrixPage() {
  const navigate = useNavigate();
  const genDemo = useServerFn(generateLaboSetupDemo);
  const genScene = useServerFn(generateLaboScene);
  const genPH = useServerFn(generateLaboPlaceholder);

  const [step, setStep] = useState<Step>("setup");

  // Setup state
  const [demo, setDemo] = useState<LaboSetup>({ product: "", client: "", enjeu: "" });
  const [demoLoading, setDemoLoading] = useState(true);
  const [product, setProduct] = useState("");
  const [client, setClient] = useState("");
  const [enjeu, setEnjeu] = useState("");
  const [clientPH, setClientPH] = useState("");
  const [enjeuPH, setEnjeuPH] = useState("");
  const [phClientLoading, setPhClientLoading] = useState(false);
  const [phEnjeuLoading, setPhEnjeuLoading] = useState(false);

  // Balance state
  const [scene, setScene] = useState<LaboScene | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [placed, setPlaced] = useState<LaboCounterpart[]>([]);
  const [hoverPan, setHoverPan] = useState(false);

  // Verdict
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await genDemo({});
        setDemo(d);
        setClientPH(d.client);
        setEnjeuPH(d.enjeu);
      } catch {
        const fb: LaboSetup = {
          product: "Plateforme SaaS de gestion RH pour PME en croissance",
          client: "DRH d'un groupe industriel, 800 collaborateurs",
          enjeu: "Réduire le coût annuel des licences RH de 25%",
        };
        setDemo(fb); setClientPH(fb.client); setEnjeuPH(fb.enjeu);
      } finally {
        setDemoLoading(false);
      }
    })();
  }, [genDemo]);

  // Refresh contextual placeholders when previous fields are completed.
  const lastProductRef = useRef("");
  const lastClientRef = useRef("");
  useEffect(() => {
    const p = product.trim();
    if (!p || p === lastProductRef.current) return;
    lastProductRef.current = p;
    setPhClientLoading(true);
    genPH({ data: { field: "client", context: { product: p } } })
      .then((r) => setClientPH(r.suggestion))
      .catch(() => {})
      .finally(() => setPhClientLoading(false));
  }, [product, genPH]);
  useEffect(() => {
    const p = product.trim() || demo.product;
    const c = client.trim();
    if (!c || c === lastClientRef.current) return;
    lastClientRef.current = c;
    setPhEnjeuLoading(true);
    genPH({ data: { field: "enjeu", context: { product: p, client: c } } })
      .then((r) => setEnjeuPH(r.suggestion))
      .catch(() => {})
      .finally(() => setPhEnjeuLoading(false));
  }, [client, product, demo.product, genPH]);

  async function startBalance() {
    const p = product.trim() || demo.product;
    const c = client.trim() || clientPH || demo.client;
    const e = enjeu.trim() || enjeuPH || demo.enjeu;
    setProduct(p); setClient(c); setEnjeu(e);
    setSceneLoading(true);
    setStep("balance");
    try {
      const s = await genScene({ data: { product: p, client: c, enjeu: e } });
      setScene(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur génération scène");
      setStep("setup");
    } finally {
      setSceneLoading(false);
    }
  }

  // Balance math + client conviction
  const totalWeight = useMemo(() => placed.reduce((s, c) => s + c.weight, 0), [placed]);
  const demandCost = scene?.demand.cost ?? 0;
  // 0 = effondré client, 0.5 = équilibre, 1 = ravi
  const conviction = useMemo(() => {
    if (!demandCost) return 0.5;
    const ratio = totalWeight / demandCost;
    return Math.max(0, Math.min(1, ratio / 2 + 0.05));
  }, [totalWeight, demandCost]);

  const remaining = useMemo(
    () => (scene?.counterparts ?? []).filter((c) => !placed.find((p) => p.id === c.id)),
    [scene, placed],
  );

  function onDropOnPan(e: React.DragEvent) {
    e.preventDefault();
    setHoverPan(false);
    const id = e.dataTransfer.getData("text/labo-card");
    const card = remaining.find((c) => c.id === id);
    if (card) setPlaced((p) => [...p, card]);
  }

  function validate() {
    if (!scene) return;
    setVerdict(totalWeight >= demandCost ? "win" : "fail");
    setStep("verdict");
  }

  function reset() {
    setPlaced([]);
    setVerdict(null);
    setStep("balance");
  }

  return (
    <div className="nego-bg min-h-screen page-fade" style={{ background: "#F9F8F6", fontFamily: "Inter, system-ui, sans-serif" }}>
      <BackButton variant="fixed" />
      <QuitButton />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3">
          <Scale className="h-7 w-7" style={{ color: "var(--marker-violet)" }} />
          <h1 className="handwritten" style={{ fontSize: "2.4rem", color: "var(--ink)" }}>
            Labo des Prix &amp; Concessions
          </h1>
        </div>
        <p className="mt-1" style={{ color: "#6B7280" }}>
          Règle d'or&nbsp;: <strong>jamais de concession sans contrepartie</strong>. Équilibre la balance.
        </p>

        {step === "setup" && (
          <SetupCard
            demo={demo}
            demoLoading={demoLoading}
            product={product} setProduct={setProduct}
            client={client} setClient={setClient}
            enjeu={enjeu} setEnjeu={setEnjeu}
            clientPH={clientPH} enjeuPH={enjeuPH}
            phClientLoading={phClientLoading} phEnjeuLoading={phEnjeuLoading}
            onStart={startBalance}
          />
        )}

        {(step === "balance" || step === "verdict") && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <section className="sketch-card-soft paper-bg" style={{ borderColor: "#2D2D2D" }}>
              {sceneLoading || !scene ? (
                <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> L'IA prépare la scène…
                </div>
              ) : (
                <>
                  <Balance
                    demand={scene.demand}
                    placed={placed}
                    totalWeight={totalWeight}
                    hoverPan={hoverPan}
                    onDragOver={(e) => { e.preventDefault(); setHoverPan(true); }}
                    onDragLeave={() => setHoverPan(false)}
                    onDrop={onDropOnPan}
                  />

                  {step === "balance" && (
                    <>
                      <h3 className="handwritten mt-6" style={{ fontSize: "1.5rem", color: "var(--ink)" }}>
                        Contreparties disponibles
                      </h3>
                      <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
                        Glisse-dépose sur le plateau droit pour équilibrer la balance.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {remaining.length === 0 ? (
                          <span style={{ color: "#9CA3AF" }} className="handwritten" >Toutes les cartes sont posées.</span>
                        ) : (
                          remaining.map((c) => <CounterpartCard key={c.id} card={c} />)
                        )}
                      </div>

                      <div className="mt-6 flex justify-between items-center">
                        <button
                          onClick={() => setPlaced([])}
                          disabled={placed.length === 0}
                          className="sketch-btn"
                          style={{ opacity: placed.length === 0 ? 0.5 : 1 }}
                        >
                          <RotateCcw size={14} />
                          <span className="handwritten" style={{ color: "var(--ink)" }}>Vider le plateau</span>
                        </button>
                        <button onClick={validate} className="sketch-btn sketch-btn-primary">
                          <span style={{ color: "var(--ink)" }}>Valider la balance</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </>
                  )}

                  {step === "verdict" && verdict && (
                    <Verdict
                      verdict={verdict}
                      totalWeight={totalWeight}
                      demandCost={demandCost}
                      onRetry={reset}
                      onHome={() => navigate({ to: "/profiles" })}
                    />
                  )}
                </>
              )}
            </section>

            <aside className="sketch-card-soft paper-bg" style={{ borderColor: "#2D2D2D" }}>
              <h2 className="handwritten" style={{ fontSize: "1.5rem", color: "var(--ink)" }}>
                Le client
              </h2>
              <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>{client || demo.client}</p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <SketchAvatar id="labo-client" conviction={conviction} size={100} />
                <ConvictionLabel conviction={conviction} />
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden border border-[color:var(--ink)]/40">
                  <div style={{
                    width: `${Math.round(conviction * 100)}%`, height: "100%",
                    background: conviction < 0.35 ? "var(--marker-red)" : conviction < 0.65 ? "var(--marker-amber)" : "var(--marker-green)",
                    transition: "width 600ms ease, background 400ms ease",
                  }} />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Setup section ---------- */

function SetupCard(props: {
  demo: LaboSetup; demoLoading: boolean;
  product: string; setProduct: (v: string) => void;
  client: string; setClient: (v: string) => void;
  enjeu: string; setEnjeu: (v: string) => void;
  clientPH: string; enjeuPH: string;
  phClientLoading: boolean; phEnjeuLoading: boolean;
  onStart: () => void;
}) {
  const { demo, demoLoading, product, setProduct, client, setClient, enjeu, setEnjeu,
    clientPH, enjeuPH, phClientLoading, phEnjeuLoading, onStart } = props;
  const inputStyle = {
    width: "100%", marginTop: 4,
    background: "var(--paper)", border: "1.5px solid var(--ink)",
    borderRadius: "var(--sketch-radius-soft)", padding: "0.6rem 0.9rem",
    fontFamily: "Inter, system-ui, sans-serif",
  } as const;
  return (
    <section className="sketch-card-soft paper-bg mt-6" style={{ borderColor: "#2D2D2D" }}>
      <div className="flex items-center justify-between">
        <h2 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>Le contexte</h2>
        {demoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <span className="handwritten flex items-center gap-1" style={{ fontSize: "1rem", color: "var(--marker-violet)" }}>
            <Wand2 size={14} /> exemples gris générés par l'IA
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Field
          label="Produit"
          value={product}
          onChange={setProduct}
          placeholder={demoLoading ? "L'IA prépare un exemple…" : demo.product}
          style={inputStyle}
        />
        <Field
          label="Client"
          value={client}
          onChange={setClient}
          placeholder={phClientLoading ? "L'IA adapte au produit…" : (clientPH || demo.client)}
          style={inputStyle}
        />
        <Field
          label="Exigence initiale du client"
          value={enjeu}
          onChange={setEnjeu}
          placeholder={phEnjeuLoading ? "L'IA adapte au client…" : (enjeuPH || demo.enjeu)}
          style={inputStyle}
          textarea
        />
      </div>

      <p className="mt-3 text-xs" style={{ color: "#9CA3AF" }}>
        Astuce&nbsp;: laisse un champ vide et l'IA adopte la suggestion grise comme ta réponse.
      </p>

      <div className="mt-6 flex justify-end">
        <button onClick={onStart} disabled={demoLoading} className="sketch-btn sketch-btn-primary">
          <span style={{ color: "var(--ink)" }}>Lancer la balance</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, style, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; style: React.CSSProperties; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="handwritten" style={{ fontSize: "1.15rem", color: "var(--ink)" }}>{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="text-gray-400 focus:text-[color:var(--ink)] placeholder:text-gray-400"
          style={style}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-gray-400 focus:text-[color:var(--ink)] placeholder:text-gray-400"
          style={style}
        />
      )}
    </label>
  );
}

/* ---------- Balance visual ---------- */

function Balance({
  demand, placed, totalWeight, hoverPan, onDragOver, onDragLeave, onDrop,
}: {
  demand: { text: string; cost: number };
  placed: LaboCounterpart[];
  totalWeight: number;
  hoverPan: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  // tilt: -12deg (left lourd) → +12deg (right lourd)
  const diff = totalWeight - demand.cost;
  const tilt = Math.max(-12, Math.min(12, diff * 2.4));

  return (
    <div className="relative">
      <h3 className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
        La balance
      </h3>

      <div className="relative mx-auto mt-2" style={{ height: 280, maxWidth: 640 }}>
        {/* Pivot + arm SVG */}
        <svg viewBox="0 0 640 280" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <filter id="balance-rough" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
              <feDisplacementMap in="SourceGraphic" scale="1.2" />
            </filter>
          </defs>
          <g stroke="#2D2D2D" strokeWidth="2.2" fill="none" strokeLinecap="round" filter="url(#balance-rough)">
            {/* base */}
            <path d="M 240 250 L 400 250" />
            <path d="M 270 250 L 320 200" />
            <path d="M 370 250 L 320 200" />
            {/* pivot */}
            <circle cx="320" cy="200" r="6" fill="#2D2D2D" />
            {/* arm — rotates */}
            <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "320px 200px", transition: "transform 500ms ease" }}>
              <path d="M 120 200 L 520 200" />
              {/* chains */}
              <path d="M 140 200 L 140 235" />
              <path d="M 500 200 L 500 235" />
            </g>
          </g>
        </svg>

        {/* Left pan (demand) */}
        <div
          style={{
            position: "absolute",
            left: "calc(50% - 200px)",
            top: 235 + Math.sin((tilt * Math.PI) / 180) * 180,
            width: 180,
            transform: "translateX(-50%)",
            transition: "top 500ms ease",
          }}
        >
          <Pan label="Demande client" tone="red">
            <p className="handwritten" style={{ fontSize: "1.15rem", color: "var(--marker-red)", lineHeight: 1.15 }}>
              {demand.text}
            </p>
            <span className="handwritten text-xs" style={{ color: "#6B7280" }}>
              poids&nbsp;: {demand.cost}
            </span>
          </Pan>
        </div>

        {/* Right pan (counterparts) */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            position: "absolute",
            left: "calc(50% + 200px)",
            top: 235 - Math.sin((tilt * Math.PI) / 180) * 180,
            width: 200,
            transform: "translateX(-50%)",
            transition: "top 500ms ease",
          }}
        >
          <Pan label="Tes contreparties" tone="green" hover={hoverPan}>
            {placed.length === 0 ? (
              <span className="handwritten" style={{ color: "#9CA3AF", fontSize: "1rem" }}>
                Glisse des cartes ici…
              </span>
            ) : (
              <div className="flex flex-wrap gap-1 justify-center">
                {placed.map((c) => (
                  <span key={c.id} className="handwritten text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--marker-teal)", color: "var(--ink)", border: "1.5px solid var(--ink)" }}>
                    {c.label} ({c.weight})
                  </span>
                ))}
              </div>
            )}
            <span className="handwritten text-xs mt-1" style={{ color: "#6B7280" }}>
              total&nbsp;: {totalWeight}
            </span>
          </Pan>
        </div>
      </div>
    </div>
  );
}

function Pan({ label, tone, hover, children }: { label: string; tone: "red" | "green"; hover?: boolean; children: React.ReactNode }) {
  const color = tone === "red" ? "var(--marker-red)" : "var(--marker-green)";
  return (
    <div
      className="sketch-card-soft paper-bg flex flex-col items-center text-center"
      style={{
        borderColor: color,
        background: hover ? "rgba(16,185,129,0.08)" : "var(--paper)",
        padding: "0.6rem 0.7rem",
        minHeight: 90,
        transform: "rotate(-0.5deg)",
      }}
    >
      <span className="handwritten text-xs mb-1" style={{ color }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function CounterpartCard({ card }: { card: LaboCounterpart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/labo-card", card.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="sketch-card-soft paper-bg cursor-grab active:cursor-grabbing select-none"
      style={{
        borderColor: "var(--marker-teal)",
        padding: "0.55rem 0.9rem",
        transform: "rotate(-1deg)",
        boxShadow: "3px 3px 0 rgba(0,0,0,0.08)",
      }}
      title="Glisse sur le plateau droit"
    >
      <p className="handwritten" style={{ fontSize: "1.1rem", color: "var(--ink)", lineHeight: 1.1 }}>
        {card.label}
      </p>
      <span className="handwritten text-xs" style={{ color: "var(--marker-teal)" }}>
        poids {card.weight}
      </span>
    </div>
  );
}

function ConvictionLabel({ conviction }: { conviction: number }) {
  const t =
    conviction < 0.35 ? { label: "Furieux", color: "var(--marker-red)" } :
    conviction < 0.65 ? { label: "Hésitant", color: "var(--marker-amber)" } :
    { label: "Apaisé", color: "var(--marker-green)" };
  return (
    <span className="handwritten" style={{ color: t.color, fontSize: "1.15rem", transform: "rotate(-1deg)", display: "inline-block" }}>
      {t.label}
    </span>
  );
}

/* ---------- Verdict ---------- */

function Verdict({
  verdict, totalWeight, demandCost, onRetry, onHome,
}: { verdict: Verdict; totalWeight: number; demandCost: number; onRetry: () => void; onHome: () => void }) {
  if (verdict === "fail") {
    return (
      <div className="mt-6 space-y-4">
        <div
          style={{
            position: "relative",
            padding: "1rem 1.2rem",
            background: "rgba(239,68,68,0.10)",
            borderLeft: "4px solid var(--marker-red)",
            borderRadius: 8,
            transform: "rotate(-0.4deg)",
          }}
        >
          <span className="handwritten flex items-center gap-1" style={{ fontSize: "1.15rem", color: "var(--marker-red)" }}>
            <AlertTriangle size={16} /> Correction au marqueur rouge
          </span>
          <p className="handwritten" style={{ fontSize: "1.8rem", color: "var(--marker-red)", lineHeight: 1.1, marginTop: 4 }}>
            « Ne fais jamais de concession sans contrepartie. »
          </p>
          <p className="mt-2" style={{ color: "var(--ink)" }}>
            Tu as cédé un poids de <strong>{demandCost}</strong> en échange de seulement <strong>{totalWeight}</strong>.
            La balance penche en ta défaveur — le client repart avec la remise <em>et</em> sans engagement.
          </p>
        </div>
        <div className="flex justify-between">
          <button onClick={onHome} className="sketch-btn">
            <span className="handwritten" style={{ color: "var(--ink)" }}>Quitter</span>
          </button>
          <button onClick={onRetry} className="sketch-btn sketch-btn-primary">
            <RotateCcw size={14} />
            <span style={{ color: "var(--ink)" }}>Rejouer la manche</span>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      <div
        style={{
          padding: "1rem 1.2rem",
          background: "rgba(16,185,129,0.10)",
          borderLeft: "4px solid var(--marker-green)",
          borderRadius: 8,
          transform: "rotate(-0.3deg)",
        }}
      >
        <span className="handwritten flex items-center gap-1" style={{ fontSize: "1.15rem", color: "var(--marker-green)" }}>
          <CheckCircle2 size={16} /> Balance équilibrée
        </span>
        <p className="handwritten" style={{ fontSize: "1.6rem", color: "var(--ink)", marginTop: 4 }}>
          Chaque concession a une contrepartie. Le client respecte le cadre.
        </p>
        <p className="mt-2" style={{ color: "var(--ink)" }}>
          Poids obtenu&nbsp;: <strong>{totalWeight}</strong> contre <strong>{demandCost}</strong> demandé.
        </p>
      </div>
      <div className="flex justify-between">
        <button onClick={onRetry} className="sketch-btn">
          <RotateCcw size={14} />
          <span className="handwritten" style={{ color: "var(--ink)" }}>Rejouer</span>
        </button>
        <button onClick={onHome} className="sketch-btn sketch-btn-primary">
          <span style={{ color: "var(--ink)" }}>Retour à l'accueil</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}