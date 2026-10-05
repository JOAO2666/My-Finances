import { requireUser } from "@/lib/auth";
import { listGoals } from "@/lib/repo";
import { GoalManager } from "@/components/goal-manager";

export const metadata = { title: "Metas & Objetivos" };

export default async function MetasPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Metas & Objetivos</h1>
        <p className="text-sm text-slate-500">
          Crie cofres e acompanhe a evolução das suas economias para reservas, sonhos e viagens.
        </p>
      </div>

      <GoalManager goals={goals} />
    </div>
  );
}
