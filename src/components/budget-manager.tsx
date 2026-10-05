"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { parseMoney } from "@/lib/format";
import { BudgetBar } from "./budget-bar";

type B = { id: string; categoryId: string; categoryName: string; color: string; limitCents: number; spentCents: number };
type C = { id: string; name: string };

export function BudgetManager({ budgets, categories }: { budgets: B[]; categories: C[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = parseMoney(amount);
    if (!categoryId) return setError("Escolha uma categoria.");
    if (!Number.isFinite(v) || v <= 0) return setError("Informe um limite válido.");
    setBusy(true);
    setError("");
    try {
      await api("POST", "/api/budgets", { categoryId, amountCents: Math.round(v * 100) });
      setAmount("");
      setCategoryId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: B) {
    if (!confirm(`Remover o orçamento de ${b.categoryName}?`)) return;
    await api("DELETE", `/api/budgets/${b.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form onSubmit={save} className="card h-fit space-y-3 lg:order-2">
        <h2 className="font-semibold text-slate-900">Definir limite mensal</h2>
        <div>
          <label className="label" htmlFor="b-cat">Categoria</label>
          <select id="b-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-amt">Limite por mês (R$)</label>
          <input id="b-amt" className="input" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar limite"}</button>
        <p className="text-xs text-slate-500">Se a categoria já tem limite, ele será atualizado.</p>
      </form>

      <section className="card space-y-4 lg:order-1 lg:col-span-2">
        {budgets.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhum orçamento definido. Crie o primeiro ao lado.</p>}
        {budgets.map((b) => (
          <div key={b.id} className="flex items-start gap-2">
            <div className="flex-1">
              <BudgetBar name={b.categoryName} color={b.color} spent={b.spentCents} limit={b.limitCents} />
            </div>
            <button
              className="btn-ghost btn-sm"
              aria-label="Editar limite"
              onClick={() => {
                setCategoryId(b.categoryId);
                setAmount((b.limitCents / 100).toFixed(2).replace(".", ","));
              }}
            >
              <Pencil size={15} />
            </button>
            <button className="btn-ghost btn-sm text-red-600" aria-label="Remover" onClick={() => remove(b)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
