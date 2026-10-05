"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Bot, CheckCircle2, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl, fmtDate, today } from "@/lib/format";
import { TransactionDialog, type CatOption, type TxEdit } from "./transaction-dialog";

export type TxItem = TxEdit & { categoryName: string | null; categoryColor: string | null; source: string };

export function NewTransactionButton({ categories, label = "Novo lançamento" }: { categories: CatOption[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> {label}
      </button>
      {open && <TransactionDialog categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}

export function TransactionList({ items, categories, empty }: { items: TxItem[]; categories: CatOption[]; empty?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TxItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(t: TxItem) {
    setBusy(t.id);
    try {
      await api("PATCH", `/api/transactions/${t.id}`, { status: t.status === "paid" ? "pending" : "paid" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: TxItem) {
    if (!confirm(`Excluir "${t.description}"?`)) return;
    setBusy(t.id);
    try {
      await api("DELETE", `/api/transactions/${t.id}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <p className="py-10 text-center text-sm text-slate-500">{empty ?? "Nenhum lançamento encontrado."}</p>;

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {items.map((t) => {
          const overdue = t.status === "pending" && t.date < today();
          return (
            <li key={t.id} className={clsx("flex items-center gap-3 py-3", busy === t.id && "opacity-50")}>
              <button
                onClick={() => toggle(t)}
                title={t.status === "paid" ? "Marcar como pendente" : t.type === "expense" ? "Marcar como pago" : "Marcar como recebido"}
                className={clsx("shrink-0", t.status === "paid" ? "text-brand-600" : overdue ? "text-red-500" : "text-slate-400")}
              >
                {t.status === "paid" ? <CheckCircle2 size={22} /> : <Clock size={22} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {t.description}
                  {t.source === "ocr" && <Camera size={12} className="ml-1.5 inline text-slate-400" aria-label="Lido por IA" />}
                  {t.source === "assistant" && <Bot size={12} className="ml-1.5 inline text-slate-400" aria-label="Via assistente" />}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span>{fmtDate(t.date)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: t.categoryColor ?? "#94a3b8" }} />
                    {t.categoryName ?? "Sem categoria"}
                  </span>
                  {overdue && <span className="badge bg-red-100 text-red-700">Atrasado</span>}
                  {t.status === "pending" && !overdue && <span className="badge bg-amber-100 text-amber-800">{t.type === "expense" ? "A pagar" : "A receber"}</span>}
                </p>
              </div>
              <p className={clsx("shrink-0 text-sm font-semibold tabular-nums", t.type === "income" ? "text-brand-700" : "text-slate-900")}>
                {t.type === "income" ? "+" : "-"} {brl(t.amountCents)}
              </p>
              <div className="flex shrink-0">
                <button className="btn-ghost btn-sm" onClick={() => setEditing(t)} aria-label="Editar">
                  <Pencil size={15} />
                </button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(t)} aria-label="Excluir">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && <TransactionDialog categories={categories} initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
