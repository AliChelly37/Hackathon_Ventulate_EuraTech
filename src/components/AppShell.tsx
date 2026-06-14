import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { SketchLogo } from "@/components/SketchLogo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: "var(--gradient-watercolor)" }}>
      <header className="border-b-[1.5px] border-ink bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <Link to="/profiles" className="flex items-center gap-2">
              <SketchLogo size={28} />
              <span className="font-hand text-2xl font-bold tracking-tight">Ventulate</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profiles"
              aria-label="Quitter et revenir à l'accueil"
              className="sketch-btn"
              style={{
                padding: "0.35rem 0.8rem",
                background: "var(--paper)",
                borderColor: "var(--ink)",
                boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
              }}
            >
              <Home size={14} />
              <span className="handwritten" style={{ color: "var(--ink)", fontSize: "1.05rem" }}>
                Quitter
              </span>
            </Link>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
              <LogOut className="h-4 w-4 mr-1" /> Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}