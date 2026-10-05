"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="card max-w-md space-y-4 !p-6 shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Não foi possível carregar esta seção</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ocorreu uma instabilidade momentânea na conexão ou no carregamento dos dados.
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
