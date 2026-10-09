"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, PanelLeftOpen } from "lucide-react";
import clsx from "clsx";
import { AppNav } from "./app-nav";
import { triggerHaptic } from "@/lib/haptics";

export function AppShell({
  name,
  avatarUrl,
  hasGeminiKey,
  children,
}: {
  name: string;
  avatarUrl?: string | null;
  hasGeminiKey: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("moneta_sidebar_collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    triggerHaptic("pop");
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("moneta_sidebar_collapsed", String(next));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Floating Re-Open Sidebar Button on Desktop when collapsed */}
      {collapsed && (
        <button
          onClick={toggleSidebar}
          type="button"
          className="fixed top-4 left-4 z-40 hidden lg:inline-flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-md shadow-slate-900/5 backdrop-blur-md hover:border-brand-500 hover:text-brand-600 active:scale-95 transition-all animate-in fade-in zoom-in-95 duration-200"
          title="Abrir painel lateral"
          aria-label="Abrir menu lateral"
        >
          <PanelLeftOpen size={16} className="text-brand-600" />
          <span>Abrir menu</span>
        </button>
      )}

      <AppNav name={name} avatarUrl={avatarUrl} collapsed={collapsed} onToggleSidebar={toggleSidebar} />

      <div
        className={clsx(
          "min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:pl-0" : "lg:pl-64"
        )}
      >
        <main
          className={clsx(
            "mx-auto px-4 pb-28 pt-6 lg:pb-10 transition-all duration-300 ease-in-out",
            collapsed ? "max-w-7xl pt-16 lg:pt-8" : "max-w-6xl"
          )}
        >
          {!hasGeminiKey && (
            <Link
              href="/configuracoes"
              prefetch={false}
              className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <KeyRound size={18} className="shrink-0" />
              <span>
                <strong>Ative a IA:</strong> adicione sua chave de API do Google (Gemini) para ler prints de faturas e usar o assistente.
              </span>
            </Link>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
