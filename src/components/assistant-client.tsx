"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";

type Created = { id: string; description: string; amountCents: number; type: "expense" | "income"; categoryName: string | null };
type Msg = { role: "user" | "assistant"; content: string; created?: Created[]; error?: boolean };

type AgentType = "sentinel" | "behavior" | "strategist" | "simulator";

const AGENTS: {
  id: AgentType;
  name: string;
  icon: string;
  subtitle: string;
  initialMsg: string;
  suggestions: string[];
}[] = [
  {
    id: "sentinel",
    name: "Sentinela",
    icon: "🛡️",
    subtitle: "Vigia o dia a dia, cobranças atípicas e vencimentos",
    initialMsg: "Olá! Sou o Agente Sentinela. Estou vigiando suas finanças no dia a dia: detecto cobranças fora do comum, assinaturas esquecidas e contas próximas do vencimento.",
    suggestions: [
      "Houve algum gasto fora do padrão?",
      "Quais contas vencem em breve?",
      "Tenho assinaturas ativas este mês?",
      "Paguei 45 reais no almoço hoje",
    ],
  },
  {
    id: "behavior",
    name: "Comportamento",
    icon: "📈",
    subtitle: "Tendências de consumo e onde o dinheiro está vazando",
    initialMsg: "Oi! Sou o Analista de Comportamento. Ajudo a entender seus hábitos quinzenais, gatilhos de consumo e onde o dinheiro pode estar escorrendo.",
    suggestions: [
      "Onde estou gastando mais sem perceber?",
      "Como está o ritmo de despesas em relação ao mês passado?",
      "Me dê 1 dica prática para conter impulsos",
    ],
  },
  {
    id: "strategist",
    name: "Estrategista",
    icon: "🎯",
    subtitle: "Projeção mensal, orçamentos e metas de economia",
    initialMsg: "Saudações! Sou o Estrategista Financeiro. Cuido da sua projeção de fechamento do mês, equilíbrio orçamentário e planos para fazer o dinheiro render.",
    suggestions: [
      "Como está a projeção para o final deste mês?",
      "Quais orçamentos estão em risco de estourar?",
      "Como distribuir minha renda de forma equilibrada?",
    ],
  },
  {
    id: "simulator",
    name: "Simulador (Computer)",
    icon: "⚡",
    subtitle: "Cálculos de cenários, cortes e quitação de dívidas",
    initialMsg: "Olá! Sou o Simulador Moneta Computer. Realizo simulações completas: antecipar dívidas vs guardar, cortes de despesas, metas de viagem e compras parceladas.",
    suggestions: [
      "Simular corte de R$ 250 em gastos extras",
      "Vale a pena quitar minha dívida à vista?",
      "Quanto guardar por mês para ter R$ 5.000 em 1 ano?",
    ],
  },
];

export function AssistantClient({ hasKey }: { hasKey: boolean }) {
  const [activeAgent, setActiveAgent] = useState<AgentType>("sentinel");
  const agentConfig = AGENTS.find((a) => a.id === activeAgent) ?? AGENTS[0];

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: agentConfig.initialMsg,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
    setActiveAgent(newAgent);
    const target = AGENTS.find((a) => a.id === newAgent);
    if (!target) return;
    setMsgs((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `*${target.icon} Conectado ao Agente ${target.name}* (${target.subtitle})\n${target.initialMsg}`,
      },
    ]);
  }

  async function send(text: string) {
    text = text.trim();
    if (!text || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const payload = [...msgs, userMsg]
        .filter((m) => !m.error)
        .slice(-12)
        .map(({ role, content }) => ({ role, content }));

      const out = await api<{ reply?: string; created?: Created[] }>("POST", "/api/assistant", {
        messages: payload,
        agent: activeAgent,
      });

      const createdList = Array.isArray(out?.created) ? out.created : [];
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: out?.reply || "Entendido!",
          created: createdList,
        },
      ]);
    } catch (e) {
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

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[28rem] flex-col !p-0 lg:h-[calc(100vh-11rem)]">
      {/* Seletor de Agentes Especialistas no Topo (Pierre Style) */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-2 sm:px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {AGENTS.map((a) => {
            const active = a.id === activeAgent;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => switchAgent(a.id)}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  active
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:bg-slate-200/60",
                )}
              >
                <span>{a.icon}</span>
                <span>{a.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-br-md bg-brand-600 text-white"
                  : m.error
                    ? "rounded-bl-md bg-red-50 text-red-700"
                    : "rounded-bl-md bg-slate-100 text-slate-800",
              )}
            >
              {m.content}
              {m.created?.map((c, idx) => (
                <div key={c.id || idx} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                  ✅ Registrado: <strong>{c.description}</strong> · {c.type === "income" ? "+" : "-"} {brl(c.amountCents ?? 0)} ·{" "}
                  {c.categoryName ?? "Sem categoria"}
                </div>
              ))}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin text-brand-600" /> {agentConfig.name} está pensando...
          </div>
        )}
        <div ref={end} />
      </div>

      {!hasKey ? (
        <div className="border-t border-slate-200 bg-amber-50 p-4 text-sm text-amber-900">
          Cadastre sua chave do Google em{" "}
          <Link href="/configuracoes" prefetch={false} className="font-semibold underline">
            Configurações
          </Link>{" "}
          para conversar com os agentes de IA.
        </div>
      ) : (
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {agentConfig.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 active:scale-95"
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
              className="input"
              placeholder={`Pergunte ao ${agentConfig.name} ou registre um gasto...`}
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
            <button type="submit" className="btn-primary active:scale-95" disabled={busy || !input.trim()} aria-label="Enviar">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
