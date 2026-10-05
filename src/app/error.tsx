"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="card max-w-md space-y-4 !p-8 shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Algo não correu como esperado</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Houve uma falha temporária ao carregar a página. Você pode tentar novamente ou voltar ao início.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="btn-primary"
            type="button"
          >
            <RefreshCw size={16} /> Tentar novamente
          </button>
          <Link
            href="/dashboard"
            prefetch={false}
            className="btn-secondary"
          >
            <Home size={16} /> Ir para o Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
