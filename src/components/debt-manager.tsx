"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { brl, fmtDate, parseMoney, today } from "@/lib/format";
import { Modal } from "./modal";

export type DebtItem = {
  id: string;
  name: string;
  creditor: string | null;
  totalCents: number;
  paidCents: number;
  dueDate: string | null;
  notes: string | null;
  source: string;
};

const fmtInput = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function DebtForm({ initial, onClose }: { initial?: DebtItem; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const total = parseMoney(String(f.get("total")));
    const paid = parseMoney(String(f.get("paid") || "0"));
    if (!Number.isFinite(total) || total <= 0) return setError("Informe o valor total.");
    const body = {
      name: String(f.get("name")),
      creditor: String(f.get("creditor")) || null,
      totalCents: Math.round(total * 100),
      ...(initial ? {} : { paidCents: Number.isFinite(paid) ? Math.round(paid * 100) : 0 }),
      dueDate: String(f.get("dueDate")) || null,
      notes: String(f.get("notes")) || null,
    };
    setBusy(true);
    try {
      if (initial) await api("PATCH", `/api/debts/${initial.id}`, body);
      else await api("POST", "/api/debts", body);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Editar dívida" : "Nova dívida"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="d-name">Nome</label>
          <input id="d-name" name="name" className="input" required maxLength={120} defaultValue={initial?.name} autoFocus placeholder="Ex.: Empréstimo, cartão..." />
        </div>
        <div>
          <label className="label" htmlFor="d-cred">Credor</label>
          <input id="d-cred" name="creditor" className="input" maxLength={120} defaultValue={initial?.creditor ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="d-total">Valor total (R$)</label>
            <input id="d-total" name="total" inputMode="decimal" className="input" required defaultValue={initial ? fmtInput(initial.totalCents) : ""} />
          </div>
          {!initial && (
            <div>
              <label className="label" htmlFor="d-paid">Já pago (R$)</label>
              <input id="d-paid" name="paid" inputMode="decimal" className="input" placeholder="0,00" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="d-due">Vencimento</label>
            <input id="d-due" name="dueDate" type="date" className="input" defaultValue={initial?.dueDate ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="d-notes">Observações</label>
          <input id="d-notes" name="notes" className="input" maxLength={1000} defaultValue={initial?.notes ?? ""} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PayForm({ debt, categoryId, onClose }: { debt: DebtItem; categoryId: string | null; onClose: () => void }) {
  const router = useRouter();
  const remaining = Math.max(0, debt.totalCents - debt.paidCents);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = parseMoney(String(f.get("amount")));
    if (!Number.isFinite(v) || v <= 0) return setError("Informe um valor válido.");
    setBusy(true);
    try {
      await api("PATCH", `/api/debts/${debt.id}`, {
        pay: { amountCents: Math.round(v * 100), date: String(f.get("date")), categoryId },
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Pagar: ${debt.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-slate-600">Saldo devedor: <strong>{brl(remaining)}</strong>. O pagamento também entra como despesa nos lançamentos.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="p-amt">Valor pago (R$)</label>
            <input id="p-amt" name="amount" inputMode="decimal" className="input" required autoFocus defaultValue={fmtInput(remaining)} />
          </div>
          <div>
            <label className="label" htmlFor="p-date">Data</label>
            <input id="p-date" name="date" type="date" className="input" required defaultValue={today()} />
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Registrando..." : "Registrar pagamento"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function DebtManager({ debts, debtCategoryId }: { debts: DebtItem[]; debtCategoryId: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState<{ debt?: DebtItem } | null>(null);
  const [paying, setPaying] = useState<DebtItem | null>(null);

  async function remove(d: DebtItem) {
    if (!confirm(`Excluir a dívida "${d.name}"? Os pagamentos já lançados são mantidos.`)) return;
    await api("DELETE", `/api/debts/${d.id}`);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setForm({})}>
          <Plus size={16} /> Nova dívida
        </button>
      </div>

      {debts.length === 0 && (
        <div className="card py-12 text-center text-sm text-slate-500">
          Nenhuma dívida cadastrada. Cadastre manualmente ou envie um print em “Ler print”.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {debts.map((d) => {
          const remaining = Math.max(0, d.totalCents - d.paidCents);
          const pct = d.totalCents ? Math.min(100, (d.paidCents / d.totalCents) * 100) : 0;
          const settled = remaining === 0;
          const late = !settled && d.dueDate && d.dueDate < today();
          return (
            <div key={d.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">
                    {d.name}
                    {d.source === "ocr" && <Camera size={13} className="ml-1.5 inline text-slate-400" aria-label="Lido por IA" />}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {d.creditor ?? "Sem credor"}
                    {d.dueDate && ` · vence ${fmtDate(d.dueDate)}`}
                  </p>
                </div>
                {settled ? (
                  <span className="badge bg-brand-100 text-brand-700">Quitada</span>
                ) : late ? (
                  <span className="badge bg-red-100 text-red-700">Atrasada</span>
                ) : null}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Pago {brl(d.paidCents)}</span>
                  <span>Total {brl(d.totalCents)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">Saldo devedor: {brl(remaining)}</p>
              </div>
              {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
              <div className="flex gap-2">
                {!settled && (
                  <button className="btn-primary btn-sm" onClick={() => setPaying(d)}>
                    <HandCoins size={14} /> Registrar pagamento
                  </button>
                )}
                <button className="btn-secondary btn-sm" onClick={() => setForm({ debt: d })}>
                  <Pencil size={14} /> Editar
                </button>
                <button className="btn-ghost btn-sm ml-auto text-red-600" onClick={() => remove(d)} aria-label="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {form && <DebtForm initial={form.debt} onClose={() => setForm(null)} />}
      {paying && <PayForm debt={paying} categoryId={debtCategoryId} onClose={() => setPaying(null)} />}
    </>
  );
}
