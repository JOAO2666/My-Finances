import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { brl, currentMonth, isMonth, monthRange } from "@/lib/format";
import { listAccounts, listCategories, listTransactions, summary } from "@/lib/repo";
import { MonthNav } from "@/components/month-nav";
import { NewTransactionButton, TransactionList } from "@/components/transaction-list";

export const metadata = { title: "Lançamentos" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LancamentosPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const m = first(sp.m);
  const month = isMonth(m) ? m : currentMonth();
  const type = first(sp.type);
  const status = first(sp.status);
  const q = first(sp.q).trim();
  const { from, to } = monthRange(month);

  const [categories, accounts, items, sum] = await Promise.all([
    listCategories(user.id),
    listAccounts(user.id),
    listTransactions(user.id, {
      from,
      to,
      type: type === "expense" || type === "income" ? type : undefined,
      status: status === "paid" || status === "pending" ? status : undefined,
      q: q || undefined,
    }),
    summary(user.id, from, to),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Lançamentos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthNav month={month} base="/lancamentos" />
          <NewTransactionButton categories={categories} accounts={accounts} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card !p-4">
          <p className="text-xs text-slate-500">Receitas do mês</p>
          <p className="text-lg font-bold text-brand-700">{brl(sum.income)}</p>
        </div>
        <div className="card !p-4">
          <p className="text-xs text-slate-500">Despesas do mês</p>
          <p className="text-lg font-bold text-red-600">{brl(sum.expense)}</p>
        </div>
        <div className="card !p-4">
          <p className="text-xs text-slate-500">Saldo previsto</p>
          <p className={`text-lg font-bold ${sum.balanceForecast >= 0 ? "text-slate-900" : "text-red-600"}`}>{brl(sum.balanceForecast)}</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input type="hidden" name="m" value={month} />
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Buscar descrição..." className="input pl-9" />
        </div>
        <select name="type" defaultValue={type} className="input !w-auto">
          <option value="">Todos os tipos</option>
          <option value="expense">Despesas</option>
          <option value="income">Receitas</option>
        </select>
        <select name="status" defaultValue={status} className="input !w-auto">
          <option value="">Todas as situações</option>
          <option value="paid">Pagos / recebidos</option>
          <option value="pending">Pendentes</option>
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>

      <div className="card !py-2">
        <TransactionList items={items} categories={categories} accounts={accounts} empty="Nada por aqui neste mês. Crie um lançamento ou envie um print." />
      </div>
    </div>
  );
}
