"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calendar,
  Camera,
  Check,
  Coins,
  Compass,
  Copy,
  CreditCard,
  Cpu,
  Landmark,
  Lightbulb,
  Loader2,
  Mic,
  Paperclip,
  Repeat,
  RotateCcw,
  Scale,
  Scissors,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Volume2,
  X,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";
import { triggerHaptic } from "@/lib/haptics";
import { ThemeToggle } from "./theme-toggle";

async function prepareImage(file: File): Promise<{ mimeType: string; data: string; preview: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.88);
  return { mimeType: "image/jpeg", data: url.split(",")[1], preview: url };
}

type AgentId = "sentinel" | "behavior" | "strategist" | "simulator";

type Agent = {
  id: AgentId;
  name: string;
  role: string;
  code: string;
  badge: string;
  avatarBg: string;
  icon: typeof ShieldCheck;
  greeting: string;
  description: string;
  starters: { title: string; prompt: string; icon: LucideIcon }[];
};

const PIERRE_AGENTS: Agent[] = [
  {
    id: "sentinel",
    name: "Albert",
    role: "Vigia do Dia a Dia",
    code: "AGENT_ALBERT_V1",
    badge: "Tempo Real",
    avatarBg: "from-blue-600 to-indigo-600",
    icon: ShieldCheck,
    greeting: "Olá. Sou o Albert. Estou vigiando suas contas e cartões para identificar cobranças atípicas, assinaturas duplicadas e desvios do padrão.",
    description: "Vigilância diária contínua e detecção de anomalias",
    starters: [
      { title: "Cobranças Estranhas", prompt: "Houve alguma cobrança estranha ou valor fora do comum esta semana?", icon: ShieldCheck },
      { title: "Contas a Vencer", prompt: "Quais contas vencem nos próximos 5 dias?", icon: Calendar },
      { title: "Assinaturas Ativas", prompt: "Detectou alguma cobrança duplicada ou assinatura esquecida?", icon: Repeat },
      { title: "Registrar Almoço", prompt: "Paguei R$ 38,90 no almoço no cartão de débito hoje", icon: CreditCard },
    ],
  },
  {
    id: "behavior",
    name: "Marie",
    role: "Comportamento & Hábitos",
    code: "AGENT_MARIE_V1",
    badge: "Quinzenal",
    avatarBg: "from-purple-600 to-pink-600",
    icon: TrendingUp,
    greeting: "Olá! Sou a Marie. Analiso quinzenalmente para onde seu dinheiro está escorrendo e quais categorias estão pesando no seu bolso.",
    description: "Análise de hábitos e tendências de consumo",
    starters: [
      { title: "Vazamentos Invisíveis", prompt: "Em qual categoria estou gastando mais sem perceber?", icon: Search },
      { title: "Evolução dos Gastos", prompt: "Como está o ritmo de despesas em relação à quinzena anterior?", icon: TrendingUp },
      { title: "Controle de Impulsos", prompt: "Me dê 1 dica prática e comportamental para poupar nesta semana", icon: Lightbulb },
      { title: "Média Diária", prompt: "Qual é o meu custo médio diário de vida neste mês?", icon: BarChart3 },
    ],
  },
  {
    id: "strategist",
    name: "Galileu",
    role: "Estrategista Mensal",
    code: "AGENT_GALILEU_V1",
    badge: "Visão 360°",
    avatarBg: "from-emerald-600 to-teal-600",
    icon: Compass,
    greeting: "Saudações. Sou o Galileu. Faço a gestão estratégica mensal: calculo a projeção de fechamento do mês, rebalanceio orçamentos e acelero suas metas.",
    description: "Projeções estratégicas de fechamento e metas",
    starters: [
      { title: "Projeção de Saldo", prompt: "Qual a projeção de saldo livre até o dia 30 deste mês?", icon: Target },
      { title: "Risco de Orçamento", prompt: "Quais categorias estão prestes a estourar o orçamento?", icon: AlertTriangle },
      { title: "Divisão Inteligente", prompt: "Como distribuir minha renda atual na regra 50-30-20?", icon: Scale },
      { title: "Acelerar Metas", prompt: "Quanto posso guardar este mês sem comprometer as contas?", icon: Sprout },
    ],
  },
  {
    id: "simulator",
    name: "Pierre Computer",
    role: "Simulador de Cenários",
    code: "AGENT_COMPUTER_V1",
    badge: "Autônomo",
    avatarBg: "from-amber-500 to-orange-600",
    icon: Cpu,
    greeting: "Pierre Computer ativo. Executo simulações matemáticas complexas: antecipação de dívidas, comparações de compras e planos de reserva financeira.",
    description: "Simulador matemático profundo de decisões financeiras",
    starters: [
      { title: "Corte de Gastos", prompt: "Simular corte de R$ 200/mês em delivery. Quanto rende em 1 ano?", icon: Scissors },
      { title: "Quitar Dívida", prompt: "Vale mais a pena quitar minha dívida à vista ou manter na reserva?", icon: Landmark },
      { title: "Meta R$ 10.000", prompt: "Quanto preciso poupar por mês para ter R$ 10.000 daqui a 12 meses?", icon: Coins },
      { title: "Compra Parcelada", prompt: "Simular o impacto de comprar um celular parcelado em 10x de R$ 350", icon: Smartphone },
    ],
  },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  imagePreview?: string;
  createdTx?: { description: string; amountCents: number; type: string }[];
  isThinking?: boolean;
};

export function PierreChatInterface({ hasKey = true }: { hasKey?: boolean }) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("sentinel");
  const agent = PIERRE_AGENTS.find((a) => a.id === selectedAgent) ?? PIERRE_AGENTS[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: agent.greeting,
      time: "Agora",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{
    file: File;
    name: string;
    preview: string;
    mimeType: string;
    data: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      const img = files.find((f) => /^image\//.test(f.type) || f.type === "application/pdf");
      if (img) {
        e.preventDefault();
        try {
          const prep = await prepareImage(img);
          setAttachedImage({ file: img, name: img.name || "print-colado.png", ...prep });
          triggerHaptic("pop");
        } catch {
          /* ignore error */
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const prep = await prepareImage(file);
      setAttachedImage({ file, name: file.name, ...prep });
      triggerHaptic("pop");
    } catch {
      alert("Não foi possível carregar a imagem.");
    }
  }

  function switchAgent(id: AgentId) {
    if (id === selectedAgent) return;
    triggerHaptic("pop");
    setSelectedAgent(id);
    const target = PIERRE_AGENTS.find((a) => a.id === id);
    if (!target) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: "assistant",
        content: `**Conectado ao ${target.name}** · *${target.role}*\n${target.greeting}`,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function handleCopy(id: string, text: string) {
    triggerHaptic("tap");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleSpeak(id: string, text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    triggerHaptic("tap");
    if (speaking === id) {
      window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "");
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = "pt-BR";
    utter.rate = 1.05;
    utter.onend = () => setSpeaking(null);
    utter.onerror = () => setSpeaking(null);
    setSpeaking(id);
    window.speechSynthesis.speak(utter);
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    const imageToSend = attachedImage;
    if ((!text && !imageToSend) || loading) return;

    triggerHaptic("tap");
    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: text || "Analise esta imagem financeira com OCR e registre no sistema.",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      imagePreview: imageToSend?.preview,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      if (imageToSend) {
        // Envia imagem diretamente para extração OCR & cruzamento com contas
        const ocrRes = await api<{
          results: Array<{
            kind: string;
            entity: string;
            id: string | null;
            description: string;
            issuer: string | null;
            amountCents: number;
            date: string;
            type: "expense" | "income";
            status: string;
            categoryName: string | null;
            accountName?: string | null;
            duplicate: boolean;
          }>;
          saved: boolean;
        }>("POST", "/api/ocr", {
          mimeType: imageToSend.mimeType,
          data: imageToSend.data,
          save: true,
        });

        triggerHaptic("success", true);

        if (!ocrRes.results || ocrRes.results.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              role: "assistant",
              content: `Analisei o print enviado, mas não identifiquei cobranças ou dados financeiros claros. Tente enviar um print mais nítido ou informe o valor por texto.`,
              time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        } else {
          const itemsSummary = ocrRes.results
            .map((r) => {
              const statusStr = r.duplicate
                ? "(já existia no sistema, duplicidade prevenida)"
                : "(registrado com sucesso)";
              const accStr = r.accountName ? ` na conta **${r.accountName}**` : "";
              const catStr = r.categoryName ? ` [${r.categoryName}]` : "";
              return `• **${r.description}**: ${brl(r.amountCents)}${catStr}${accStr} ${statusStr}`;
            })
            .join("\n");

          const replyText =
            `**${agent.name} aqui.** Analisei o print enviado e extraí via OCR:\n\n${itemsSummary}\n\n` +
            (text
              ? `Em relação à sua mensagem ("${text}"): os valores foram cruzados com suas contas bancárias e categorias.`
              : `Todos os dados foram cruzados e integrados às suas finanças.`);

          const createdTx = ocrRes.results
            .filter((r) => !r.duplicate)
            .map((r) => ({
              description: r.description,
              amountCents: r.amountCents,
              type: r.type,
            }));

          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              role: "assistant",
              content: replyText,
              time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              createdTx,
            },
          ]);
        }
      } else {
        const history = [...messages, userMsg]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await api<{
          reply: string;
          transactions?: { description: string; amount: number; type: "expense" | "income" }[];
        }>("POST", "/api/assistant", {
          agent: selectedAgent,
          messages: history,
        });

        triggerHaptic("success", true);

        const createdTx = res.transactions?.map((t) => ({
          description: t.description,
          amountCents: Math.round(t.amount * 100),
          type: t.type,
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: "assistant",
            content: res.reply || "Tudo certo! Análise processada.",
            time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            createdTx,
          },
        ]);
      }
    } catch (err) {
      triggerHaptic("error", true);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: err instanceof Error ? err.message : "Desculpe, ocorreu uma instabilidade ao conectar com a IA.",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-8.5rem)] min-h-[36rem] w-full max-w-5xl mx-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#070b12] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden font-sans">
      {/* Ambient Radial Glow (Pierre Luxury Aesthetic) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-emerald-500/10 dark:bg-[#a3ff12]/10 blur-3xl" />

      {/* Top Pierre Chat Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#070b12]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={() => triggerHaptic("tap")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition active:scale-95"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Painel</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-bold text-sm shadow-md">
              P
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  Pierre <span className="text-emerald-500 dark:text-[#a3ff12]">Chat</span>
                </span>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {agent.code} · Open Finance IA
              </p>
            </div>
          </div>
        </div>

        {/* Pierre 4-Agent Pill Switcher */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 p-1 overflow-x-auto scrollbar-none">
          {PIERRE_AGENTS.map((a) => {
            const isSelected = a.id === selectedAgent;
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => switchAgent(a.id)}
                type="button"
                className={clsx(
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all select-none active:scale-95",
                  isSelected
                    ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <Icon size={13} className={isSelected ? "text-emerald-500 dark:text-[#a3ff12]" : "opacity-60"} />
                <span>{a.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="p-1.5" />
          <button
            onClick={() => {
              triggerHaptic("warning");
              setMessages([{ id: "welcome", role: "assistant", content: agent.greeting, time: "Agora" }]);
            }}
            title="Reiniciar conversa"
            className="rounded-xl border border-slate-200 dark:border-white/10 p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white active:scale-90 transition"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* Main Messages Feed */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Card if first message */}
        {messages.length <= 1 && (
          <div className="mx-auto max-w-2xl text-center space-y-4 pt-4 pb-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white shadow-xl shadow-emerald-500/20">
              <agent.icon size={28} />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-[#a3ff12]">
                <Sparkles size={13} />
                <span>Agente Especializado Pierre</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {agent.name} · {agent.role}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {agent.description}
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="grid gap-2.5 sm:grid-cols-2 text-left pt-2">
              {agent.starters.map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(st.prompt)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-3.5 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-lg hover:shadow-emerald-950/10 transition-all duration-200 active:scale-95"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-[#a3ff12] transition-colors">
                      {st.title}
                    </span>
                    <st.icon size={16} className="text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-[#a3ff12] transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {st.prompt}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-[#a3ff12] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Executar prompt</span>
                    <ArrowUpRight size={11} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={clsx(
                "flex gap-3",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              {!isUser && (
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr ${agent.avatarBg} text-white shadow-md shadow-brand-500/20`}>
                  <agent.icon size={16} />
                </span>
              )}

              <div
                className={clsx(
                  "relative max-w-[85%] rounded-3xl p-4 text-sm sm:max-w-xl transition-all shadow-xs",
                  isUser
                    ? "bg-gradient-to-r from-brand-600 to-emerald-600 text-white rounded-br-xs"
                    : "border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 rounded-bl-xs"
                )}
              >
                {m.imagePreview && (
                  <div className="mb-2.5 overflow-hidden rounded-2xl border border-white/20 max-w-xs shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.imagePreview} alt="Print anexado" className="max-h-52 w-auto object-cover rounded-2xl" />
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>

                {/* If transaction was created */}
                {m.createdTx && m.createdTx.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    <p className="font-bold text-emerald-700 dark:text-[#a3ff12] flex items-center gap-1">
                      <Check size={14} /> Lançamento gravado no sistema:
                    </p>
                    {m.createdTx.map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center font-mono">
                        <span className="truncate">{tx.description}</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {brl(tx.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Actions on AI messages */}
                {!isUser && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 dark:border-white/10 pt-2 text-[11px] text-slate-400">
                    <span>{m.time}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                        title="Copiar resposta"
                      >
                        {copiedId === m.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => handleSpeak(m.id, m.content)}
                        className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                        title="Ouvir em áudio"
                      >
                        <Volume2 size={13} className={speaking === m.id ? "text-emerald-500 animate-pulse" : ""} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr ${agent.avatarBg} text-white animate-pulse`}>
              <agent.icon size={16} />
            </span>
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-emerald-500 dark:text-[#a3ff12]" />
              <span>{agent.name} está analisando o print e cruzando seus dados bancários...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Signature Floating Pierre Bottom Input Bar */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070b12]/95 p-3 sm:p-4 backdrop-blur-xl">
        {attachedImage && (
          <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-900 dark:text-emerald-300 animate-in fade-in slide-in-from-bottom-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachedImage.preview} alt="" className="size-11 rounded-xl object-cover border border-emerald-500/30 shadow-xs" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold block truncate text-slate-900 dark:text-white">{attachedImage.name}</span>
              <span className="text-[11px] text-emerald-600 dark:text-[#a3ff12]">Pronto para extrair com OCR & cruzar contas ao enviar</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="rounded-xl p-1.5 hover:bg-emerald-500/20 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              title="Remover print"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form
          action="javascript:void(0)"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="relative flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-white/15 bg-slate-100/80 dark:bg-white/[0.05] p-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner"
        >
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar print ou comprovante (ou cole com Ctrl+V)"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-[#a3ff12] transition active:scale-90"
            >
              <Paperclip size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileSelect}
            />
            <Link
              href="/importar"
              prefetch={false}
              title="Central de importação em lote"
              className="hidden sm:inline-flex rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition active:scale-90"
            >
              <Camera size={17} />
            </Link>
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`Pergunte ao ${agent.name} ou registre: "gastei 50 no almoço"...`}
            className="flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            maxLength={1000}
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn rounded-xl bg-slate-900 text-white dark:bg-[#a3ff12] dark:text-black font-bold p-2.5 disabled:opacity-30 active:scale-95 transition-all shadow-md"
            aria-label="Enviar"
          >
            <Send size={15} />
          </button>
        </form>

        <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Pierre Chat conecta inteligência artificial ao seu banco via Open Finance. Suas informações são privadas e criptografadas.
        </p>
      </footer>
    </div>
  );
}
