import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AssistantClient } from "@/components/assistant-client";

export const metadata = { title: "Agentes Especialistas Pierre" };

export default async function AssistentePage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agentes Especialistas Pierre</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sua equipe de IA dedicada: Albert (vigia diário), Marie (hábitos quinzenais), Galileu (estratégia mensal) e Pierre Computer (simulador de cenários).
        </p>
      </div>
      <Suspense fallback={<div className="card h-96 animate-pulse bg-slate-100 dark:bg-slate-800" />}>
        <AssistantClient hasKey={user.hasGeminiKey} />
      </Suspense>
    </div>
  );
}
