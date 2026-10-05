"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Plus, Trash2, Wallet, PiggyBank, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { api } from "@/lib/client";
import { brl } from "@/lib/format";
import { Modal } from "./modal";
import type { Account, AccountType } from "@/lib/repo";

const TYPE_CONFIG: Record<AccountType, { label: string; icon: typeof Landmark }> = {
  checking: { label: "Conta Corrente", icon: Landmark },
  savings: { label: "Poupança", icon: PiggyBank },
  credit_card: { label: "Cartão de Crédito", icon: CreditCard },
  cash: { label: "Dinheiro / Carteira", icon: Wallet },
  investment: { label: "Investimento", icon: TrendingUp },
};

export function AccountManager({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("0,00");
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [color, setColor] = useState("#10b981");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const bankAccounts = accounts.filter((a) => a.type !== "credit_card");
  const creditCards = accounts.filter((a) => a.type === "credit_card");

  const totalBalanceCents = bankAccounts.reduce((acc, a) => acc + a.balanceCents, 0);
  const totalLimitCents = creditCards.reduce((acc, a) => acc + (a.creditLimitCents ?? 0), 0);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("checking");
    setInstitution("");
    setBalance("0,00");
    setCreditLimit("");
    setClosingDay("");
    setDueDay("");
    setColor("#10b981");
    setErr("");
    setModalOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setName(a.name);
    setType(a.type);
    setInstitution(a.institution ?? "");
    setBalance((a.balanceCents / 100).toFixed(2).replace(".", ","));
    setCreditLimit(a.creditLimitCents ? (a.creditLimitCents / 100).toFixed(2).replace(".", ",") : "");
    setClosingDay(a.closingDay ? String(a.closingDay) : "");
    setDueDay(a.dueDay ? String(a.dueDay) : "");
    setColor(a.color);
    setErr("");
    setModalOpen(true);
  }

  const parseCents = (v: string) => Math.round(Number(v.replace(/\./g, "").replace(",", ".").trim() || 0) * 100);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const payload = {
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        balanceCents: type === "credit_card" ? 0 : parseCents(balance),
        creditLimitCents: type === "credit_card" && creditLimit ? parseCents(creditLimit) : undefined,
        closingDay: closingDay ? Number(closingDay) : undefined,
        dueDay: dueDay ? Number(dueDay) : undefined,
        color,
      };

      if (editing) {
        await api("PATCH", `/api/accounts/${editing.id}`, payload);
      } else {
        await api("POST", "/api/accounts", payload);
      }
      setModalOpen(false);
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta conta/cartão?")) return;
    try {
      await api("DELETE", `/api/accounts/${id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner de Saldos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card !p-5">
          <p className="text-xs font-medium text-slate-500">Saldo Consolidado em Contas</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{brl(totalBalanceCents)}</p>
          <p className="mt-1 text-xs text-slate-400">{bankAccounts.length} contas cadastradas</p>
        </div>
        <div className="card !p-5">
          <p className="text-xs font-medium text-slate-500">Limite Total em Cartões</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-indigo-600">{brl(totalLimitCents)}</p>
          <p className="mt-1 text-xs text-slate-400">{creditCards.length} cartões ativos</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Suas Contas e Cartões</h2>
        <button onClick={openCreate} type="button" className="btn-primary">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Contas */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Contas Bancárias e Carteiras</h3>
        {!bankAccounts.length ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Nenhuma conta bancária cadastrada. Clique em "Adicionar" para registrar seu Nubank, Itaú, Inter ou dinheiro físico.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((a) => {
              const Icon = TYPE_CONFIG[a.type]?.icon || Landmark;
              return (
                <div key={a.id} className="card card-interactive flex flex-col justify-between !p-4" onClick={() => openEdit(a)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl text-white" style={{ backgroundColor: a.color }}>
                        <Icon size={20} />
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{TYPE_CONFIG[a.type]?.label || a.type}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(a.id);
                      }}
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Excluir conta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Saldo atual</span>
                    <span className="text-lg font-bold tabular-nums text-slate-900">{brl(a.balanceCents)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cartões de Crédito */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Cartões de Crédito</h3>
        {!creditCards.length ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Nenhum cartão cadastrado. Adicione cartões com dia de fechamento e limite para controlar faturas.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((c) => (
              <div key={c.id} className="card card-interactive flex flex-col justify-between !p-4" onClick={() => openEdit(c)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                      <CreditCard size={20} />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.institution || "Cartão de Crédito"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(c.id);
                    }}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Excluir cartão"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Limite de Crédito</span>
                    <span className="font-bold tabular-nums text-slate-800">{c.creditLimitCents ? brl(c.creditLimitCents) : "Sem limite"}</span>
                  </div>
                  {(c.closingDay || c.dueDay) && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      {c.closingDay && <span>Fecha dia: <strong>{c.closingDay}</strong></span>}
                      {c.dueDay && <span>Vence dia: <strong>{c.dueDay}</strong></span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <Modal title={editing ? "Editar Conta / Cartão" : "Nova Conta ou Cartão"} onClose={() => setModalOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            {err && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{err}</div>}

            <div>
              <label className="label">Nome da Conta / Cartão</label>
              <input
                className="input"
                placeholder="Ex.: Nubank Roxinho, Itaú Corrente, Carteira"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="cash">Dinheiro / Carteira</option>
                  <option value="investment">Investimento</option>
                </select>
              </div>
              <div>
                <label className="label">Instituição (Opcional)</label>
                <input
                  className="input"
                  placeholder="Ex.: Nubank, Itaú"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
            </div>

            {type !== "credit_card" ? (
              <div>
                <label className="label">Saldo Atual (R$)</label>
                <input
                  className="input"
                  placeholder="0,00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">Limite do Cartão (R$)</label>
                  <input
                    className="input"
                    placeholder="Ex.: 5000,00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Dia do Fechamento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="input"
                      placeholder="Ex.: 15"
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Dia do Vencimento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="input"
                      placeholder="Ex.: 22"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2">
                {["#10b981", "#6366f1", "#f43f5e", "#f59e0b", "#8b5cf6", "#06b6d4", "#64748b"].map((c) => (
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
                {busy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
