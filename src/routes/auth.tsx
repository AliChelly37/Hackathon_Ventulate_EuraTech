import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Convaincre" },
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="inline-block h-10 w-10 rounded-full gradient-conviction" />
          <h1 className="text-3xl font-bold">Convaincre</h1>
        </div>
        <p className="text-center text-muted-foreground mb-8">
          Entraînez vos négociations face à une table d'interlocuteurs simulés.
        </p>
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="p1">Mot de passe</Label><Input id="p1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Connexion…" : "Se connecter"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="p2">Mot de passe</Label><Input id="p2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full rounded-full">{loading ? "Création…" : "Créer mon compte"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}