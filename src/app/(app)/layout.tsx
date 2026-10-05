import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen lg:pl-60">
      <AppNav name={user.name} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-10">
        {!user.hasGeminiKey && (
          <Link
            href="/configuracoes"
            prefetch={false}
            className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
          >
            <KeyRound size={18} className="shrink-0" />
            <span>
              <strong>Ative a IA:</strong> adicione sua chave de API do Google (Gemini) para ler prints de faturas e usar o assistente.
            </span>
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
