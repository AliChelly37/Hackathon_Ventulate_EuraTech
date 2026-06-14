import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SketchLogo } from "@/components/SketchLogo";

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
    <div
      className="nego-bg min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundImage: "var(--gradient-watercolor)" }}
    >
      <div className="w-full max-w-md page-fade">
        <div className="flex flex-col items-center gap-3 mb-8">
          <SketchLogo size={68} />
          <h1 className="font-hand text-5xl font-bold tracking-tight text-ink leading-none">
            Ventulate
          </h1>
          <p className="handwritten text-center text-ink-soft text-lg max-w-sm">
            Entraînez vos négociations face à une table d'interlocuteurs simulés.
          </p>
        </div>

        <div className="sketch-card-soft tilt-neg-1" style={{ padding: "1.75rem" }}>
          <Tabs defaultValue="login">
            <TabsList
              className="grid grid-cols-2 mb-6 w-full bg-transparent gap-2 h-auto p-0"
            >
              <TabsTrigger
                value="login"
                className="sketch-btn data-[state=active]:sketch-btn-primary justify-center"
              >
                Connexion
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="sketch-btn data-[state=active]:sketch-btn-primary justify-center"
              >
                Créer un compte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <SketchField id="e1" label="Email" type="email" value={email} onChange={setEmail} />
                <SketchField id="p1" label="Mot de passe" type="password" value={password} onChange={setPassword} minLength={6} />
                <button
                  type="submit"
                  disabled={loading}
                  className="sketch-btn sketch-btn-primary w-full justify-center disabled:opacity-60"
                  style={{ fontSize: "1.5rem" }}
                >
                  {loading ? "Connexion…" : "Se connecter"}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-5">
                <SketchField id="e2" label="Email" type="email" value={email} onChange={setEmail} />
                <SketchField id="p2" label="Mot de passe" type="password" value={password} onChange={setPassword} minLength={6} />
                <button
                  type="submit"
                  disabled={loading}
                  className="sketch-btn sketch-btn-primary w-full justify-center disabled:opacity-60"
                  style={{ fontSize: "1.5rem" }}
                >
                  {loading ? "Création…" : "Créer mon compte"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center handwritten text-ink-soft text-base">
          Un carnet d'entraînement, pas un logiciel.
        </p>
      </div>
    </div>
  );
}

function SketchField({
  id,
  label,
  type,
  value,
  onChange,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="handwritten text-lg text-ink">
        {label}
      </Label>
      <input
        id={id}
        type={type}
        value={value}
        required
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper px-4 py-2.5 font-sans text-base text-ink outline-none focus:bg-[color:var(--wash-teal)] transition-colors"
        style={{
          border: "1.5px solid var(--ink)",
          borderRadius: "14px 4px 16px 6px / 6px 16px 4px 14px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
        }}
      />
    </div>
  );
}

// noop guard to keep AuthPage as default export shape
function _noop() {
}