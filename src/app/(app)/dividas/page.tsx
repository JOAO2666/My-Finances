import { requireUser } from "@/lib/auth";
import { brl } from "@/lib/format";
import { listCategories, listDebts } from "@/lib/repo";
import { DebtManager } from "@/components/debt-manager";

export const metadata = { title: "Dívidas" };

export default async function DividasPage() {
  const user = await requireUser();
  const [debts, categories] = await Promise.all([listDebts(user.id), listCategories(user.id)]);
  const open = debts.reduce((a, d) => a + Math.max(0, d.totalCents - d.paidCents), 0);
  const debtCat = categories.find((c) => c.type === "expense" && c.name === "Dívidas e financiamentos");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dívidas</h1>
        <p className="text-sm text-slate-500">
          Saldo devedor total: <strong className="text-slate-900">{brl(open)}</strong>
        </p>
      </div>
      <DebtManager debts={debts} debtCategoryId={debtCat?.id ?? null} />
    </div>
  );
}
