"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Plus, Trash2, Calendar, Sparkles, TrendingUp, Minus } from "lucide-react";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";
import { Modal } from "./modal";
import type { Goal } from "@/lib/repo";

export function GoalManager({ goals }: { goals: Goal[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [contribOpen, setContribOpen] = useState<Goal | null>(null);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState("#10b981");

  const [contribAmount, setContribAmount] = useState("");
  const [contribType, setContribType] = useState<"add" | "sub">("add");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const parseCents = (v: string) => Math.round(Number(v.replace(/\./g, "").replace(",", ".").trim() || 0) * 100);

  function openCreate() {
    setName("");
    setTarget("");
    setCurrent("0,00");
    setDeadline("");
    setColor("#10b981");
    setErr("");
    setModalOpen(true);
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("POST", "/api/goals", {
        name: name.trim(),
        targetCents: parseCents(target),
        currentCents: parseCents(current),
        deadline: deadline || undefined,
        color,
      });
      setModalOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar meta.");
    } finally {
      setBusy(false);
    }
  }

  async function saveContrib(e: React.FormEvent) {
    e.preventDefault();
    if (!contribOpen) return;
    setBusy(true);
    try {
      const cents = parseCents(contribAmount);
      const delta = contribType === "add" ? cents : -cents;
      await api("PATCH", `/api/goals/${contribOpen.id}`, { contributeCents: delta });
      setContribOpen(null);
      setContribAmount("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar valor.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta meta financeira?")) return;
    try {
      await api("DELETE", `/api/goals/${id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  const totalTargetCents = goals.reduce((acc, g) => acc + g.targetCents, 0);
  const totalSavedCents = goals.reduce((acc, g) => acc + g.currentCents, 0);

  return (
    <div className="space-y-6">
      {/* Resumo Geral de Metas */}
      <div className="card !p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Guardado em Metas</p>
            <p className="text-2xl font-black tabular-nums text-slate-900">{brl(totalSavedCents)}</p>
            <p className="mt-0.5 text-xs text-slate-400">Meta global: {brl(totalTargetCents)}</p>
          </div>
          <button onClick={openCreate} type="button" className="btn-primary">
            <Plus size={16} /> Nova Meta
          </button>
        </div>
      </div>

      {!goals.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Nenhuma meta financeira cadastrada. Crie objetivos como "Reserva de Emergência", "Viagem" ou "Trocar de Carro" para acompanhar seu progresso!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = g.targetCents > 0 ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 100)) : 0;
            const completed = g.currentCents >= g.targetCents;

            return (
              <div key={g.id} className="card flex flex-col justify-between space-y-4 !p-5">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: g.color }}>
                        <Target size={18} />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">{g.name}</h3>
                        {g.deadline && (
                          <p className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar size={11} /> Até {g.deadline}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(g.id)}
                      className="text-slate-300 hover:text-red-600"
                      aria-label="Excluir meta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-slate-700">{brl(g.currentCents)}</span>
                      <span className="text-slate-400">Alvo: {brl(g.targetCents)} ({pct}%)</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {completed ? "🎉 Meta alcançada!" : `Faltam ${brl(g.targetCents - g.currentCents)}`}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setContribOpen(g);
                        setContribType("sub");
                        setContribAmount("");
                      }}
                      className="btn-secondary btn-sm"
                      title="Retirar valor"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContribOpen(g);
                        setContribType("add");
                        setContribAmount("");
                      }}
                      className="btn-primary btn-sm"
                    >
                      <Plus size={13} /> Guardar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Meta */}
      {modalOpen && (
        <Modal title="Nova Meta Financeira" onClose={() => setModalOpen(false)}>
          <form onSubmit={saveGoal} className="space-y-4">
            {err && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{err}</div>}
            <div>
              <label className="label">Nome da Meta</label>
              <input
                className="input"
                placeholder="Ex.: Reserva de Emergência, Viagem para a Praia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor Alvo (R$)</label>
                <input
                  className="input"
                  placeholder="Ex.: 10000,00"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Já guardado (R$)</label>
                <input
                  className="input"
                  placeholder="0,00"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Data Limite Desejada (Opcional)</label>
              <input
                type="date"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2">
                {["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="size-7 rounded-full border-2 transition-transform active:scale-90"
                    style={{ backgroundColor: c, borderColor: color === c ? "#0f172a" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={busy || !name.trim()} className="btn-primary">
                {busy ? "Criando..." : "Criar Meta"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Aporte / Retirada */}
      {contribOpen && (
        <Modal
          title={`${contribType === "add" ? "Guardar na meta" : "Retirar da meta"}: ${contribOpen.name}`}
          onClose={() => setContribOpen(null)}
        >
          <form onSubmit={saveContrib} className="space-y-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                className="input"
                placeholder="Ex.: 150,00"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setContribOpen(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={busy || !contribAmount.trim()} className="btn-primary">
                {busy ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
