import { requireUser } from "@/lib/auth";
import { ImportClient } from "@/components/import-client";

export const metadata = { title: "Ler print" };

export default async function ImportarPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ler print & Comprovantes com IA</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Envie capturas de comprovantes Pix, boletos, faturas, notas fiscais, extratos de investimentos ou dívidas. A IA extrai valores, cruza com suas contas e categorias para evitar duplicidades e registra tudo automaticamente.
        </p>
      </div>
      <ImportClient hasKey={user.hasGeminiKey} />
    </div>
  );
}
