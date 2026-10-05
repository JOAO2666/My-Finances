"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Compass,
  Cpu,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Check,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";
import { triggerHaptic } from "@/lib/haptics";

type Created = { id: string; description: string; amountCents: number; type: "expense" | "income"; categoryName: string | null };
type Msg = { role: "user" | "assistant"; content: string; created?: Created[]; error?: boolean };

type AgentType = "sentinel" | "behavior" | "strategist" | "simulator";

type AgentDef = {
  id: AgentType;
  name: string;
  role: string;
  badge: string;
  badgeColor: string;
  icon: typeof ShieldCheck;
  subtitle: string;
  initialMsg: string;
  suggestions: string[];
};

const AGENTS: AgentDef[] = [
  {
    id: "sentinel",
    name: "Albert",
    role: "Vigia do Dia a Dia",
    badge: "Sentinela Ativo",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    icon: ShieldCheck,
    subtitle: "Vigia o dia a dia, cobranças anômalas, duplicadas e vencimentos",
    initialMsg:
      "Olá! Sou o Albert, seu Agente Sentinela. Estou vigiando suas finanças no dia a dia: detecto cobranças fora do comum, assinaturas esquecidas e contas próximas do vencimento.",
    suggestions: [
      "Houve algum gasto fora do padrão esta semana?",
      "Quais contas vencem nos próximos dias?",
      "Detectou alguma cobrança duplicada ou assinatura?",
      "Paguei R$ 45 no almoço hoje",
    ],
  },
  {
    id: "behavior",
    name: "Marie",
    role: "Comportamento & Hábitos",
    badge: "Análise Quinzenal",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    icon: TrendingUp,
    subtitle: "Analisa o comportamento quinzenal e onde o dinheiro está vazando",
    initialMsg:
      "Oi! Sou a Marie, Analista de Comportamento Financeiro. Meu papel é entender seus hábitos de consumo na quinzena e identificar vazamentos invisíveis no seu orçamento.",
    suggestions: [
      "Onde estou gastando mais sem perceber?",
      "Qual categoria teve o maior aumento nos últimos 15 dias?",
      "Me dê 1 dica prática para conter compras por impulso",
      "Qual meu ritmo diário de despesas?",
    ],
  },
  {
    id: "strategist",
    name: "Galileu",
    role: "Estrategista Mensal",
    badge: "Visão 360°",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    icon: Compass,
    subtitle: "Projeção mensal consolidada, orçamentos e metas de economia",
    initialMsg:
      "Saudações! Sou o Galileu, seu Estrategista Financeiro. Cuido da sua visão mensal completa: projeção de saldo livre ao final do mês, rebalanceamento e metas de economia.",
    suggestions: [
      "Qual a projeção de fechamento do meu saldo este mês?",
      "Quais orçamentos de categoria estão sob risco de estouro?",
      "Como distribuir minha renda de forma equilibrada (50-30-20)?",
      "Como acelerar minha reserva de emergência?",
    ],
  },
  {
    id: "simulator",
    name: "Pierre Computer",
    role: "Simulador de Cenários",
    badge: "Modo Autônomo",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    icon: Cpu,
    subtitle: "Compara opções, simula quitação de dívidas e cortes orçamentários",
    initialMsg:
      "Olá! Sou o Pierre Computer. Realizo simulações profundas e cálculos matemáticos: antecipar dívidas vs guardar, impactos de cortes específicos e compras parceladas.",
    suggestions: [
      "Simular corte de R$ 250 em gastos extras",
      "Vale a pena quitar minha dívida à vista ou manter na reserva?",
      "Quanto guardar por mês para ter R$ 5.000 em 1 ano?",
      "Simular impacto de uma compra parcelada de R$ 1.200 em 6x",
    ],
  },
];

export function AssistantClient({ hasKey }: { hasKey: boolean }) {
  const searchParams = useSearchParams();
  const initialAgentParam = searchParams.get("agent") as AgentType | null;
  const initialQ = searchParams.get("q") ?? "";

  const [activeAgent, setActiveAgent] = useState<AgentType>(() => {
    if (initialAgentParam && AGENTS.some((a) => a.id === initialAgentParam)) {
      return initialAgentParam;
    }
    return "sentinel";
  });

  const agentConfig = AGENTS.find((a) => a.id === activeAgent) ?? AGENTS[0];

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: agentConfig.initialMsg,
    },
  ]);
  const [input, setInput] = useState(initialQ);
  const [busy, setBusy] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customAgents, setCustomAgents] = useState<{ name: string; goal: string }[]>([]);

  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      end.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      /* ignore scroll errors */
    }
  }, [msgs, busy]);

  function switchAgent(newAgent: AgentType) {
    if (newAgent === activeAgent) return;
    triggerHaptic("pop");
    setActiveAgent(newAgent);
    const target = AGENTS.find((a) => a.id === newAgent);
    if (!target) return;
    setMsgs((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `*Conectado ao Agente ${target.name}* (${target.role} — ${target.subtitle})\n${target.initialMsg}`,
      },
    ]);
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    triggerHaptic("tap");
    const userMsg: Msg = { role: "user", content: text };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput("");
    setBusy(true);

    try {
      const history = nextMsgs
        .filter((m) => !m.error)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const out = await api<{
        reply: string;
        transactions?: { description: string; amount: number; date?: string; type: "expense" | "income"; category?: string; paid: boolean }[];
      }>("POST", "/api/assistant", {
        agent: activeAgent,
        messages: history,
      });

      triggerHaptic("success");

      const createdList: Created[] = [];
      if (out?.transactions && Array.isArray(out.transactions) && out.transactions.length > 0) {
        for (const t of out.transactions) {
          createdList.push({
            id: String(Date.now()),
            description: t.description,
            amountCents: Math.round(t.amount * 100),
            type: t.type,
            categoryName: t.category ?? null,
          });
        }
      }

      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: out?.reply || "Entendido!",
          created: createdList,
        },
      ]);
    } catch (e) {
      triggerHaptic("error");
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Erro ao falar com a IA. Tente novamente.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleCreateCustomAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) return;
    triggerHaptic("success");
    setCustomAgents((prev) => [...prev, { name: customName, goal: customGoal }]);
    setMsgs((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `*Agente Personalizado "${customName}" Ativado!*\nObjetivo: ${customGoal || "Monitoramento financeiro sob medida."}\nVocê já pode fazer perguntas ou registrar lançamentos específicos para este agente.`,
      },
    ]);
    setShowCustomModal(false);
    setCustomName("");
    setCustomGoal("");
  }

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[30rem] flex-col !p-0 lg:h-[calc(100vh-11rem)] overflow-hidden">
      {/* Seletor de Agentes Especialistas no Topo (Pierre Architecture) */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5">
            {AGENTS.map((a) => {
              const active = a.id === activeAgent;
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => switchAgent(a.id)}
                  className={clsx(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all select-none active:scale-95",
                    active
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/50",
                  )}
                >
                  <Icon size={15} className={active ? "text-brand-600 dark:text-brand-400" : "text-slate-400"} />
                  <span>{a.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="btn-ghost btn-sm shrink-0 gap-1 text-[11px] text-brand-700 dark:text-brand-400 border border-dashed border-brand-300 dark:border-brand-800 rounded-xl px-2.5 py-1"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Criar Agente</span>
          </button>
        </div>

        {/* Profile Card do Agente Selecionado */}
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 shrink-0">
              <agentConfig.icon size={15} />
            </span>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{agentConfig.name}</span>
                <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">· {agentConfig.role}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{agentConfig.subtitle}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${agentConfig.badgeColor}`}>
            {agentConfig.badge}
          </span>
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-xl",
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-xs"
                  : m.error
                    ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60"
                    : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.created && m.created.length > 0 && (
                <div className="mt-2.5 space-y-1.5 border-t border-slate-200/60 dark:border-slate-700 pt-2 text-xs">
                  <p className="font-semibold text-brand-700 dark:text-brand-400">Lançamento registrado com sucesso:</p>
                  {m.created.map((c) => (
                    <div key={c.id} className="flex justify-between gap-2 font-mono">
                      <span>{c.description}</span>
                      <span className="font-bold">{brl(c.amountCents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 size={14} className="animate-spin text-brand-600" /> {agentConfig.name} está cruzando suas finanças...
          </div>
        )}
        <div ref={end} />
      </div>

      {/* Input e Sugestões */}
      {!hasKey ? (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200">
          Cadastre sua chave do Google em{" "}
          <Link href="/configuracoes" prefetch={false} className="font-semibold underline">
            Configurações
          </Link>{" "}
          para interagir com {agentConfig.name} e os demais agentes.
        </div>
      ) : (
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {agentConfig.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-50 active:scale-95 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            action="javascript:void(0)"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2"
          >
            <input
              className="input text-xs"
              placeholder={`Pergunte ao ${agentConfig.name} (${agentConfig.role}) ou registre um gasto...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              maxLength={1000}
            />
            <button
              type="submit"
              className="btn-primary active:scale-95 px-3.5"
              disabled={busy || !input.trim()}
              aria-label="Enviar"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Modal: Criar Agente Personalizado (Pierre Style) */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400">
                  <Bot size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Criar Agente Personalizado</h3>
                  <p className="text-xs text-slate-500">Defina um foco ou alerta personalizado (ex.: Pierre)</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomAgent} className="space-y-3">
              <div>
                <label className="label" htmlFor="ag-name">Nome do Agente</label>
                <input
                  id="ag-name"
                  type="text"
                  required
                  placeholder="Ex: Vigia de Delivery, Alerta do Dólar, Teto Lazer"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label" htmlFor="ag-goal">Instrução ou Alerta a Monitorar</label>
                <textarea
                  id="ag-goal"
                  rows={3}
                  required
                  placeholder="Ex: Me avise toda vez que eu gastar mais de R$ 150 em restaurantes na semana, ou faça uma análise mensal dos meus custos fixos."
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-xs font-semibold">
                  <Check size={14} /> Ativar Agente Personalizado
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
