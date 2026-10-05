"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, TrendingUp, PiggyBank, Target } from "lucide-react";
import { api } from "@/lib/client";
import { Modal } from "./modal";

type AuditResult = {
  score: number;
  verdict: string;
  summaryText: string;
  highlights: string[];
  anomalies: string[];
  savingsOpportunities: { title: string; description: string; potentialSavings: string }[];
  monthEndForecast: string;
};

export function AuditButton({ hasKey }: { hasKey: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setOpen(true);
    if (data) return; // já gerado nesta sessão
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuditResult>("POST", "/api/audit");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar diagnóstico com a IA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={runAudit}
        type="button"
        className="btn group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-700 active:scale-95"
      >
        <Sparkles size={16} className="animate-pulse text-amber-200" />
        <span>Raio-X com IA</span>
      </button>

      {open && (
        <Modal title="Raio-X Financeiro (Auditoria IA)" onClose={() => setOpen(false)}>
          {!hasKey ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Para gerar o Raio-X completo, cadastre sua chave de API do Google em Configurações.
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 size={32} className="animate-spin text-brand-600" />
              <p className="mt-4 font-semibold text-slate-800">Analisando suas finanças...</p>
              <p className="text-xs text-slate-500">Cruzando receitas, despesas, orçamentos e pendências com o mês anterior.</p>
            </div>
          ) : error ? (
            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              <button onClick={runAudit} className="btn-primary w-full" type="button">
                Tentar novamente
              </button>
            </div>
          ) : data ? (
            <div className="space-y-5 py-2">
              {/* Score & Veredito */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Saúde Financeira</p>
                  <p className="mt-1 text-2xl font-black text-emerald-400">{data.verdict}</p>
                  <p className="mt-1 text-xs text-slate-300">{data.summaryText}</p>
                </div>
                <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                  <span className="text-2xl font-black tabular-nums">{data.score}</span>
                  <span className="text-[10px] text-slate-400">de 100</span>
                </div>
              </div>

              {/* Destaques Positivos */}
              {data.highlights?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <CheckCircle2 size={14} /> Pontos Fortes
                  </h3>
                  <div className="space-y-1.5">
                    {data.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertas & Anomalias */}
              {data.anomalies?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                    <AlertTriangle size={14} /> Pontos de Atenção
                  </h3>
                  <div className="space-y-1.5">
                    {data.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Oportunidades de Economia */}
              {data.savingsOpportunities?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                    <PiggyBank size={14} /> Oportunidades de Economia
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {data.savingsOpportunities.map((op, i) => (
                      <div key={i} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
                        <p className="font-bold text-blue-900">{op.title}</p>
                        <p className="mt-1 text-slate-600">{op.description}</p>
                        <p className="mt-2 font-semibold text-emerald-600">Economia: {op.potentialSavings}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projeção de Fim de Mês */}
              {data.monthEndForecast && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <p className="flex items-center gap-1 font-bold text-slate-800">
                    <Target size={14} className="text-brand-600" /> Projeção de Fechamento:
                  </p>
                  <p className="mt-1 text-slate-600">{data.monthEndForecast}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
                  Fechar
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </>
  );
}
