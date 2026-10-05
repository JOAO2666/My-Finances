import { requireUser } from "@/lib/auth";
import { brl, currentMonth, isMonth } from "@/lib/format";
import { listBudgets, listCategories } from "@/lib/repo";
import { MonthNav } from "@/components/month-nav";
import { BudgetManager } from "@/components/budget-manager";

export const metadata = { title: "Orçamentos" };

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const { m } = await searchParams;
  const month = isMonth(m) ? m : currentMonth();
  const [budgets, categories] = await Promise.all([listBudgets(user.id, month), listCategories(user.id)]);
  const limit = budgets.reduce((a, b) => a + b.limitCents, 0);
  const spent = budgets.reduce((a, b) => a + b.spentCents, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          {budgets.length > 0 && (
            <p className="text-sm text-slate-500">
              Gasto {brl(spent)} de {brl(limit)} planejados ({Math.round((spent / limit) * 100)}%)
            </p>
          )}
        </div>
        <MonthNav month={month} base="/orcamentos" />
      </div>
      <BudgetManager budgets={budgets} categories={categories.filter((c) => c.type === "expense")} />
    </div>
  );
}
