"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Camera, CreditCard, FileBarChart, Landmark, LayoutDashboard, LogOut, PiggyBank, Receipt, Settings, Target } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";

const items = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/dividas", label: "Dívidas", icon: CreditCard },
  { href: "/assistente", label: "Assistente", icon: Bot },
  { href: "/importar", label: "Ler print", icon: Camera },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppNav({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await api("POST", "/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <Link href="/dashboard" prefetch={false} className="mb-6 flex items-center gap-2 px-2 text-xl font-bold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">M</span> Moneta
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                path.startsWith(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-sm font-medium text-slate-800">{name}</p>
          <button onClick={logout} className="btn-ghost mt-1 w-full justify-start px-2 text-slate-500">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" prefetch={false} className="flex items-center gap-2 font-bold text-brand-700">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">M</span> Moneta
        </Link>
        <button onClick={logout} className="btn-ghost btn-sm" aria-label="Sair">
          <LogOut size={16} />
        </button>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-slate-200 bg-white/95 px-1 py-1 backdrop-blur lg:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={clsx(
              "flex min-w-[4.6rem] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium",
              path.startsWith(href) ? "text-brand-700" : "text-slate-500",
            )}
          >
            <Icon size={20} /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
