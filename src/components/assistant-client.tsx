"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";

type Created = { id: string; description: string; amountCents: number; type: "expense" | "income"; categoryName: string | null };
type Msg = { role: "user" | "assistant"; content: string; created?: Created[]; error?: boolean };

const SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Onde estou gastando mais?",
  "Gastei 45 reais no mercado hoje",
  "Quais contas vencem em breve?",
  "Como posso economizar?",
];

export function AssistantClient({ hasKey }: { hasKey: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Oi! Sou seu assistente financeiro. Pergunte sobre seus gastos ou me conte um gasto/ganho (ex.: “paguei 120 de luz ontem”) que eu registro para você.",
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
      const out = await api<{ reply?: string; created?: Created[] }>("POST", "/api/assistant", { messages: payload });
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
    <div className="card flex h-[calc(100vh-14rem)] min-h-[26rem] flex-col !p-0 lg:h-[calc(100vh-11rem)]">
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
            <Loader2 size={15} className="animate-spin" /> Pensando...
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
          para conversar com o assistente.
        </div>
      ) : (
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
              placeholder="Pergunte ou registre um gasto..."
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
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()} aria-label="Enviar">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
