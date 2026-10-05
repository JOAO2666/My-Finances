import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/repo";
import { SettingsClient } from "@/components/settings-client";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const categories = await listCategories(user.id);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">
          {user.name} · {user.email}
        </p>
      </div>
      <SettingsClient hasKey={user.hasGeminiKey} model={user.geminiModel} categories={categories} />
    </div>
  );
}
