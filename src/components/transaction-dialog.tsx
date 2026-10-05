"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { parseMoney, today } from "@/lib/format";
import { Modal } from "./modal";

export type CatOption = { id: string; name: string; type: "expense" | "income" };
export type TxEdit = {
  id: string;
  type: "expense" | "income";
  description: string;
  amountCents: number;
  date: string;
  status: "paid" | "pending";
  categoryId: string | null;
  notes: string | null;
};

export function TransactionDialog({
  categories,
  initial,
  defaultType = "expense",
  onClose,
}: {
  categories: CatOption[];
  initial?: TxEdit;
  defaultType?: "expense" | "income";
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">(initial?.type ?? defaultType);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cats = categories.filter((c) => c.type === type);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = parseMoney(String(f.get("amount")));
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe um valor válido.");
    const body = {
      type,
      description: String(f.get("description")),
      amountCents: Math.round(amount * 100),
      date: String(f.get("date")),
      status: f.get("status") === "pending" ? "pending" : "paid",
      categoryId: String(f.get("categoryId")) || null,
      notes: String(f.get("notes") ?? "") || null,
    };
    setBusy(true);
    setError("");
    try {
      if (initial) await api("PATCH", `/api/transactions/${initial.id}`, body);
      else await api("POST", "/api/transactions", body);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Editar lançamento" : "Novo lançamento"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg py-1.5 text-sm font-medium transition ${
                type === t ? (t === "expense" ? "bg-red-600 text-white" : "bg-brand-600 text-white") : "text-slate-600"
              }`}
            >
              {t === "expense" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <input id="description" name="description" className="input" required maxLength={200} defaultValue={initial?.description} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="amount">Valor (R$)</label>
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              className="input"
              required
              placeholder="0,00"
              defaultValue={initial ? (initial.amountCents / 100).toFixed(2).replace(".", ",") : ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="date">Data / vencimento</label>
            <input id="date" name="date" type="date" className="input" required defaultValue={initial?.date ?? today()} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="categoryId">Categoria</label>
            <select key={type} id="categoryId" name="categoryId" className="input" defaultValue={initial?.type === type ? (initial?.categoryId ?? "") : ""}>
              <option value="">Sem categoria</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" className="input" defaultValue={initial?.status ?? "paid"}>
              <option value="paid">{type === "expense" ? "Pago" : "Recebido"}</option>
              <option value="pending">{type === "expense" ? "A pagar" : "A receber"}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Observações</label>
          <input id="notes" name="notes" className="input" maxLength={1000} defaultValue={initial?.notes ?? ""} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
