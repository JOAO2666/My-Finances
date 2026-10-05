"use client";

import Link from "next/link";
import { Bot, Compass, Cpu, Plus, ShieldCheck, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export const AGENT_PROFILES = [
  {
    id: "sentinel",
    name: "Albert",
    role: "Vigia do Dia a Dia",
    badge: "Sentinela Ativo",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    icon: ShieldCheck,
    iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
    description: "Monitora cobranças anômalas, duplicadas, assinaturas esquecidas e contas próximas do vencimento.",
    quickPrompt: "Houve algum gasto fora do comum esta semana?",
    tag: "Tempo Real",
  },
  {
    id: "behavior",
    name: "Marie",
    role: "Comportamento & Hábitos",
    badge: "Análise Quinzenal",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    icon: TrendingUp,
    iconColor: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
    description: "Identifica onde o dinheiro está vazando sem você perceber e aponta tendências de consumo.",
    quickPrompt: "Em qual categoria estou gastando mais sem perceber?",
    tag: "Quinzenal",
  },
  {
    id: "strategist",
    name: "Galileu",
    role: "Estrategista Mensal",
    badge: "Visão 360°",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    icon: Compass,
    iconColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
    description: "Calcula a projeção de fechamento do mês, rebalanceia orçamentos e acelera suas metas financeiras.",
    quickPrompt: "Qual a projeção de saldo livre até o fim do mês?",
    tag: "Mensal",
  },
  {
    id: "simulator",
    name: "Pierre Computer",
    role: "Simulador de Cenários",
    badge: "Modo Autônomo",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    icon: Cpu,
    iconColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
    description: "Compara opções, simula quitação de dívidas vs investimentos e cortes de gastos específicos.",
    quickPrompt: "Simular corte de R$ 200/mês em delivery",
    tag: "Simulador",
  },
];

export function AgentTeamWidget() {
  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white shadow-xs">
            <Bot size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white">
                Agentes Especialistas Pierre
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> 4 Ativos
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sua equipe de inteligência artificial vigiando despesas, comportamento e projeções.
            </p>
          </div>
        </div>

        <Link
          href="/assistente"
          prefetch={false}
          onClick={() => triggerHaptic("pop")}
          className="btn-secondary btn-sm"
        >
          <span>Abrir Sala de IA</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AGENT_PROFILES.map((agent) => {
          const Icon = agent.icon;
          return (
            <Link
              key={agent.id}
              href={`/assistente?agent=${agent.id}&q=${encodeURIComponent(agent.quickPrompt)}`}
              prefetch={false}
              onClick={() => triggerHaptic("pop")}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-brand-400 hover:bg-white hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-850 dark:hover:border-slate-700 active:scale-95"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span className={`grid size-9 place-items-center rounded-xl ${agent.iconColor}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${agent.badgeColor}`}>
                    {agent.tag}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 transition-colors">
                  {agent.name}
                </h3>
                <p className="text-[11px] font-medium text-brand-700 dark:text-brand-400 mb-1.5">
                  {agent.role}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {agent.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] font-semibold text-brand-700 dark:border-slate-800 dark:text-brand-400">
                <span>Perguntar agora</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
