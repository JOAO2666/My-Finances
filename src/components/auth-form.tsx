"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isReg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("POST", `/api/auth/${mode}`, Object.fromEntries(f));
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-xl font-bold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">M</span> Moneta
        </Link>
        <form onSubmit={submit} className="card space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">{isReg ? "Crie sua conta" : "Entre na sua conta"}</h1>
          {isReg && (
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input id="name" name="name" className="input" required minLength={2} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha {isReg && <span className="text-slate-400">(mín. 8 caracteres)</span>}</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              minLength={isReg ? 8 : 1}
              autoComplete={isReg ? "new-password" : "current-password"}
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Aguarde..." : isReg ? "Criar conta" : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {isReg ? (
            <>Já tem conta? <Link href="/login" className="font-medium text-brand-700 hover:underline">Entrar</Link></>
          ) : (
            <>Novo por aqui? <Link href="/register" className="font-medium text-brand-700 hover:underline">Criar conta grátis</Link></>
          )}
        </p>
      </div>
    </main>
  );
}
