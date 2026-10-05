import { requireUser } from "@/lib/auth";
import { ImportClient } from "@/components/import-client";

export const metadata = { title: "Ler print" };

export default async function ImportarPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ler print com IA</h1>
        <p className="text-sm text-slate-500">
          Envie capturas de faturas, boletos ou dívidas. A IA extrai valor, vencimento e descrição e registra tudo para você.
        </p>
      </div>
      <ImportClient hasKey={user.hasGeminiKey} />
    </div>
  );
}
