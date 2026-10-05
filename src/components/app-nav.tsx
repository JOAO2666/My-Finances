"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Camera,
  CreditCard,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PiggyBank,
  Receipt,
  Settings,
  Target,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { triggerHaptic } from "@/lib/haptics";
import { ThemeToggle } from "./theme-toggle";

const items = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/dividas", label: "Dívidas", icon: CreditCard },
  { href: "/assistente", label: "Agentes IA", icon: Bot },
  { href: "/importar", label: "Ler print", icon: Camera },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppNav({
  name,
  collapsed = false,
  onToggleSidebar,
}: {
  name: string;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  async function logout() {
    triggerHaptic("warning");
    await api("POST", "/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  function handleNavClick(href: string) {
    setActiveItem(href);
    triggerHaptic("pop", true);
    setTimeout(() => setActiveItem(null), 300);
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 lg:flex z-20 shadow-sm transition-transform duration-300 ease-in-out",
          collapsed && "-translate-x-full pointer-events-none"
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={() => handleNavClick("/dashboard")}
            className="group flex items-center gap-2.5 text-xl font-bold text-brand-700 transition active:scale-95"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-brand-700 to-emerald-500 text-white shadow-md shadow-brand-500/20 group-hover:rotate-6 transition-transform">
              M
            </span>
            <span className="tracking-tight text-slate-900 dark:text-white">
              My <span className="text-brand-600">Finances</span>
            </span>
          </Link>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 active:scale-90 transition"
              title="Fechar painel lateral (mais espaço na tela)"
              aria-label="Fechar painel lateral"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.map(({ href, label, icon: Icon }) => {
            const isCurrent = path.startsWith(href);
            const isClicked = activeItem === href;

            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() => handleNavClick(href)}
                className={clsx(
                  "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out select-none",
                  "active:scale-[0.93] active:brightness-95",
                  isClicked && "scale-[0.94] bg-brand-100 text-brand-800 ring-2 ring-brand-400/40",
                  isCurrent && !isClicked
                    ? "bg-gradient-to-r from-brand-50 to-emerald-50/50 text-brand-700 font-semibold shadow-xs"
                    : !isClicked && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "grid size-8 place-items-center rounded-lg transition-transform duration-200",
                      "group-hover:scale-110 group-active:scale-90 group-active:-rotate-6",
                      isCurrent ? "bg-brand-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <span>{label}</span>
                </div>

                {isCurrent && (
                  <span className="h-4 w-1 rounded-full bg-brand-600 shadow-xs animate-in fade-in zoom-in-50 duration-200" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{name}</p>
              <p className="text-[11px] text-slate-400">Online</p>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            className="btn-ghost w-full justify-start gap-2 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition active:scale-95"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden shadow-xs">
        <Link
          href="/dashboard"
          prefetch={false}
          onClick={() => handleNavClick("/dashboard")}
          className="flex items-center gap-2 font-bold text-slate-900 active:scale-95 transition"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-tr from-brand-700 to-emerald-500 text-sm font-bold text-white shadow-xs">
            M
          </span>
          <span className="tracking-tight">
            My <span className="text-brand-600">Finances</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={logout}
            className="btn-ghost btn-sm text-slate-500 hover:text-red-600 active:scale-90 transition"
            aria-label="Sair"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-slate-200/80 bg-white/95 px-1 py-1.5 backdrop-blur-lg lg:hidden shadow-lg scrollbar-none">
        {items.map(({ href, label, icon: Icon }) => {
          const isCurrent = path.startsWith(href);
          const isClicked = activeItem === href;

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={() => handleNavClick(href)}
              className={clsx(
                "group relative flex min-w-[4.4rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1 text-[11px] font-medium transition-all duration-150 select-none",
                "active:scale-90 active:bg-brand-50/70",
                isClicked && "scale-90 bg-brand-100/90 text-brand-800",
                isCurrent && !isClicked ? "text-brand-700 font-semibold" : !isClicked && "text-slate-500 hover:text-slate-900",
              )}
            >
              <span
                className={clsx(
                  "grid size-7 place-items-center rounded-lg transition-transform duration-200",
                  "group-hover:scale-110 group-active:scale-75 group-active:-rotate-6",
                  isCurrent ? "bg-brand-100 text-brand-700" : "text-slate-600",
                )}
              >
                <Icon size={19} />
              </span>
              <span className="truncate leading-none">{label}</span>
              {isCurrent && (
                <span className="size-1 rounded-full bg-brand-600" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
