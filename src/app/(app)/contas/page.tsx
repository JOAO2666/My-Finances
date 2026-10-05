import { requireUser } from "@/lib/auth";
import { listAccounts } from "@/lib/repo";
import { AccountManager } from "@/components/account-manager";

export const metadata = { title: "Contas & Cartões" };

export default async function ContasPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contas & Cartões</h1>
        <p className="text-sm text-slate-500">
          Gerencie suas contas bancárias, cartões de crédito e carteiras físicas no mesmo lugar.
        </p>
      </div>

      <AccountManager accounts={accounts} />
    </div>
  );
}
