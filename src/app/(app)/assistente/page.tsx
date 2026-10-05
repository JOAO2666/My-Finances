import { requireUser } from "@/lib/auth";
import { AssistantClient } from "@/components/assistant-client";

export const metadata = { title: "Assistente" };

export default async function AssistentePage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assistente financeiro</h1>
        <p className="text-sm text-slate-500">Converse sobre suas finanças ou registre gastos em linguagem natural.</p>
      </div>
      <AssistantClient hasKey={user.hasGeminiKey} />
    </div>
  );
}
