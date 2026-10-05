import Link from "next/link";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CalendarClock, CreditCard, Landmark, PiggyBank, Plus, Scale, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { brl, currentMonth, fmtDate, isMonth, monthRange, today } from "@/lib/format";
import { categoryBreakdown, getSmartAlerts, listAccounts, listBudgets, listCategories, listGoals, listTransactions, monthlySeries, summary, upcomingBills } from "@/lib/repo";
import { MonthNav } from "@/components/month-nav";
import { CategoryDonut, MonthlyBars } from "@/components/charts";
import { NewTransactionButton, TransactionList } from "@/components/transaction-list";
import { BudgetBar } from "@/components/budget-bar";
import { SmartAlertsBanner } from "@/components/smart-alerts";
import { AuditButton } from "@/components/audit-modal";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const { m } = await searchParams;
  const month = isMonth(m) ? m : currentMonth();
  const { from, to } = monthRange(month);

  const [categories, sum, spend, series, budgets, bills, recent, alerts, accounts, goals] = await Promise.all([
    listCategories(user.id),
    summary(user.id, from, to),
    categoryBreakdown(user.id, from, to, "expense"),
    monthlySeries(user.id, month, 6),
    listBudgets(user.id, month),
    upcomingBills(user.id, 6),
    listTransactions(user.id, { from, to, limit: 8 }),
    getSmartAlerts(user.id),
    listAccounts(user.id),
    listGoals(user.id),
  ]);

  const overBudgets = budgets.filter((b) => b.spentCents >= b.limitCents * 0.8).sort((a, b) => b.spentCents / b.limitCents - a.spentCents / a.limitCents);
  const liquidAccounts = accounts.filter((a) => a.type !== "credit_card");
  const creditAccounts = accounts.filter((a) => a.type === "credit_card");
  const totalLiquid = liquidAccounts.reduce((acc, a) => acc + a.balanceCents, 0);
  const totalCreditBill = creditAccounts.reduce((acc, a) => acc + a.balanceCents, 0);
  const totalGoalsSaved = goals.reduce((acc, g) => acc + g.currentCents, 0);
  const totalGoalsTarget = goals.reduce((acc, g) => acc + g.targetCents, 0);

  const cards = [
    { label: "Receitas", value: sum.income, sub: `Recebido ${brl(sum.incomePaid)}`, icon: ArrowUpCircle, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Despesas", value: sum.expense, sub: `A pagar ${brl(sum.expensePending)}`, icon: ArrowDownCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Saldo realizado", value: sum.balanceRealized, sub: "Receitas pagas − despesas pagas", icon: Scale, color: sum.balanceRealized >= 0 ? "text-slate-900" : "text-red-600", bg: "bg-slate-100" },
    { label: "Saldo previsto", value: sum.balanceForecast, sub: "Se tudo for pago/recebido", icon: CalendarClock, color: sum.balanceForecast >= 0 ? "text-blue-700" : "text-red-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500">Veja como estão suas finanças em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthNav month={month} base="/dashboard" />
          <AuditButton hasKey={user.hasGeminiKey} />
          <NewTransactionButton categories={categories} accounts={accounts} label="Lançar" />
        </div>
      </div>

      <SmartAlertsBanner alerts={alerts} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card !p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className={`grid size-8 place-items-center rounded-lg ${bg} ${color}`}>
                <Icon size={18} />
              </span>
            </div>
            <p className={`mt-2 text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{brl(value)}</p>
            <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {overBudgets.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <strong>Atenção ao orçamento:</strong>{" "}
            {overBudgets.map((b) => `${b.categoryName} (${Math.round((b.spentCents / b.limitCents) * 100)}%)`).join(", ")}.{" "}
            <Link href="/orcamentos" className="font-medium underline">Ver orçamentos</Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold text-slate-900">Despesas por categoria</h2>
          <CategoryDonut data={spend} />
        </section>
        <section className="card">
          <h2 className="mb-2 font-semibold text-slate-900">Últimos 6 meses</h2>
          <MonthlyBars data={series} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Contas a pagar</h2>
            <Link href="/lancamentos?status=pending" className="text-xs font-medium text-brand-700 hover:underline">Ver todas</Link>
          </div>
          {bills.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhuma conta pendente. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {bills.map((b) => {
                const late = b.date < today();
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{b.description}</p>
                      <p className={late ? "text-xs font-medium text-red-600" : "text-xs text-slate-500"}>
                        {late ? "Atrasada · " : "Vence "}
                        {fmtDate(b.date)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{brl(b.amountCents)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Orçamentos</h2>
            <Link href="/orcamentos" className="text-xs font-medium text-brand-700 hover:underline">Gerenciar</Link>
          </div>
          {budgets.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Defina limites por categoria em <Link href="/orcamentos" className="font-medium text-brand-700 underline">Orçamentos</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {budgets.slice(0, 5).map((b) => (
                <BudgetBar key={b.id} name={b.categoryName} color={b.color} spent={b.spentCents} limit={b.limitCents} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-brand-600" />
              <h2 className="font-semibold text-slate-900">Contas & Cartões</h2>
            </div>
            <Link href="/contas" prefetch={false} className="text-xs font-medium text-brand-700 hover:underline">
              Gerenciar
            </Link>
          </div>
          {accounts.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              Nenhuma conta ou cartão cadastrado.{" "}
              <Link href="/contas" prefetch={false} className="font-medium text-brand-700 underline">
                Cadastrar agora
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-500">Saldo disponível em contas:</span>
                <span className="font-bold text-slate-900 tabular-nums">{brl(totalLiquid)}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {accounts.slice(0, 4).map((acc) => {
                  const isCard = acc.type === "credit_card";
                  return (
                    <li key={acc.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="size-2.5 rounded-full shrink-0" style={{ background: acc.color }} />
                        <div className="truncate">
                          <p className="truncate font-medium text-slate-900">{acc.name}</p>
                          <p className="text-xs text-slate-400">
                            {acc.institution ? `${acc.institution} · ` : ""}
                            {isCard ? "Cartão de Crédito" : "Conta Corrente / Carteira"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-semibold tabular-nums ${isCard ? "text-red-600" : "text-slate-900"}`}>
                          {brl(acc.balanceCents)}
                        </span>
                        {isCard && acc.creditLimitCents && (
                          <p className="text-[11px] text-slate-400">Limite: {brl(acc.creditLimitCents)}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Metas & Cofres</h2>
            </div>
            <Link href="/metas" prefetch={false} className="text-xs font-medium text-brand-700 hover:underline">
              Gerenciar
            </Link>
          </div>
          {goals.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              Nenhuma meta cadastrada ainda. Crie seu cofre de reserva em{" "}
              <Link href="/metas" prefetch={false} className="font-medium text-brand-700 underline">
                Metas
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-500">Total acumulado:</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {brl(totalGoalsSaved)} {totalGoalsTarget > 0 && <span className="font-normal text-slate-400">/ {brl(totalGoalsTarget)}</span>}
                </span>
              </div>
              <div className="space-y-2.5">
                {goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, Math.round((g.currentCents / Math.max(1, g.targetCents)) * 100));
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <span className="font-semibold text-slate-600 tabular-nums">
                          {brl(g.currentCents)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: g.color || "#059669" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card !pb-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Lançamentos recentes</h2>
          <Link href={`/lancamentos?m=${month}`} className="text-xs font-medium text-brand-700 hover:underline">Ver todos</Link>
        </div>
        <TransactionList items={recent} categories={categories} accounts={accounts} empty="Sem lançamentos neste mês ainda." />
      </section>
    </div>
  );
}
