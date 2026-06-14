import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SketchLogo } from "@/components/SketchLogo";
import { SketchButton } from "@/components/sketch/SketchButton";
import { SketchCard } from "@/components/sketch/SketchCard";
import { SketchInput } from "@/components/sketch/SketchField";
import { Highlighter } from "@/components/sketch/Highlighter";
import { SketchStroke } from "@/components/sketch/SketchStroke";
import { riseIn, stagger } from "@/lib/motion";
import { CommitteeAnimation } from "@/components/auth/CommitteeAnimation";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Ventulate" },
      { name: "description", content: "Connectez-vous pour entraîner vos négociations." },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/profiles" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect. Si vous venez de créer le compte, utilisez exactement le même mot de passe."
          : error.message;
      return toast.error(message);
    }
    navigate({ to: "/profiles" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session || data.user) {
      toast.success("Compte créé. Bienvenue !");
      navigate({ to: "/profiles" });
      return;
    }
    toast.success("Compte créé. Vérifiez votre email pour l'activer.");
  }

  return (
    <div className="relative min-h-screen w-full grid grid-cols-1 lg:grid-cols-[46fr_54fr] overflow-hidden">
      {/* LEFT PAGE — form */}
      <div className="relative flex items-center justify-center px-4 py-10 lg:py-12">
        <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="w-full max-w-md"
      >
        <motion.div variants={riseIn} className="flex flex-col items-center text-center gap-3 mb-9">
          <SketchLogo size={76} />
          <h1 className="font-hand text-6xl font-semibold text-ink leading-[0.95] tracking-tight">
            Ventulate
          </h1>
          <p className="font-sans text-[var(--ink-soft)] text-lg max-w-sm leading-snug">
            Entraînez vos négociations face à <Highlighter delay={0.5}>une table d'interlocuteurs</Highlighter> simulés.
          </p>
          <div className="mt-1 h-3 w-44">
            <SketchStroke
              d="M3 6 C 60 1, 130 10, 237 4"
              width="100%" height={10} viewBox="0 0 240 10"
              stroke="var(--marker-teal)" strokeWidth={3} delay={0.4} duration={0.7}
            />
          </div>
        </motion.div>

        <motion.div variants={riseIn}>
          <SketchCard index={1} className="p-7">
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 mb-6 w-full">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Créer un compte</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <SketchInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  <SketchInput label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" />
                  <SketchButton type="submit" disabled={loading} size="lg" className="w-full">
                    {loading ? "Connexion…" : "Se connecter"}
                  </SketchButton>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-5">
                  <SketchInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  <SketchInput label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" hint="Au moins 6 caractères." />
                  <SketchButton type="submit" disabled={loading} size="lg" className="w-full">
                    {loading ? "Création…" : "Créer mon compte"}
                  </SketchButton>
                </form>
              </TabsContent>
            </Tabs>
          </SketchCard>
        </motion.div>

        <motion.p variants={riseIn} className="mt-7 text-center font-hand text-[var(--ink-soft)] text-lg">
          Un carnet d'entraînement, pas un logiciel.
        </motion.p>
        </motion.div>

        {/* Mobile static strip */}
        <div className="lg:hidden absolute inset-x-0 top-0 h-28 -z-10 opacity-60">
          <CommitteeAnimation staticFrame />
        </div>
      </div>

      {/* SPINE */}
      <div
        aria-hidden
        className="hidden lg:block absolute left-[46%] top-0 bottom-0 w-px"
        style={{
          background: "repeating-linear-gradient(to bottom, var(--ink-faint) 0 6px, transparent 6px 12px)",
          boxShadow: "2px 0 8px -4px var(--shadow-color), -2px 0 8px -4px var(--shadow-color)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* RIGHT PAGE — committee animation (desktop only) */}
      <div className="hidden lg:block relative" style={{ isolation: "isolate" }}>
        <CommitteeAnimation />
      </div>
    </div>
  );
}