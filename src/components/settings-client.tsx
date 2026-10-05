"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, KeyRound, Smartphone, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { ThemeToggle } from "./theme-toggle";

type Cat = { id: string; name: string; type: "expense" | "income"; color: string };

function Msg({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return (
    <p role={ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
      {text}
    </p>
  );
}

function GeminiSection({ hasKey, model }: { hasKey: boolean; model: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [mdl, setMdl] = useState(model);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>({ ok: true, text: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: true, text: "" });
    try {
      await api("PUT", "/api/settings/gemini", { apiKey: key.trim() || undefined, model: mdl.trim() });
      setKey("");
      setMsg({ ok: true, text: "Chave validada e salva com sucesso. A IA já está ativa." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remover sua chave do Google? A leitura de prints e o assistente deixarão de funcionar.")) return;
    await api("DELETE", "/api/settings/gemini");
    setMsg({ ok: true, text: "Chave removida." });
    router.refresh();
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <KeyRound size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Chave de API do Google (Gemini)</h2>
          <p className="text-sm text-slate-500">
            Usada para ler prints e para o assistente. Fica criptografada no servidor e nunca é exibida de volta.{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
              Gerar chave grátis <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </div>
      {hasKey && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
          <CheckCircle2 size={16} /> Chave configurada
        </p>
      )}
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label" htmlFor="gk">{hasKey ? "Substituir chave (opcional)" : "Chave de API"}</label>
          <input
            id="gk"
            type="password"
            className="input font-mono"
            placeholder={hasKey ? "••••••••••••••••••••" : "AIza..."}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            required={!hasKey}
          />
        </div>
        <div>
          <label className="label" htmlFor="gm">Modelo</label>
          <input id="gm" list="models" className="input" value={mdl} onChange={(e) => setMdl(e.target.value)} required />
          <datalist id="models">
            <option value="gemini-2.5-flash" />
            <option value="gemini-2.5-flash-lite" />
            <option value="gemini-2.5-pro" />
            <option value="gemini-2.0-flash" />
          </datalist>
          <p className="mt-1 text-xs text-slate-500">Flash é rápido e econômico (recomendado para OCR). Você pode digitar qualquer modelo Gemini com suporte a imagens.</p>
        </div>
        <Msg {...msg} />
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? "Validando..." : "Validar e salvar"}</button>
          {hasKey && (
            <button type="button" className="btn-secondary text-red-600" onClick={remove}>Remover chave</button>
          )}
        </div>
      </form>
    </section>
  );
}

function CategorySection({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [msg, setMsg] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("POST", "/api/categories", { name, type, color });
      setName("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro.");
    }
  }

  async function remove(c: Cat) {
    if (!confirm(`Excluir a categoria "${c.name}"? Os lançamentos ficarão sem categoria e o orçamento dela será removido.`)) return;
    await api("DELETE", `/api/categories/${c.id}`);
    router.refresh();
  }

  return (
    <section className="card space-y-4">
      <h2 className="font-semibold text-slate-900">Categorias</h2>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="cn">Nova categoria</label>
          <input id="cn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </div>
        <select aria-label="Tipo" className="input !w-auto" value={type} onChange={(e) => setType(e.target.value as "expense" | "income")}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <input type="color" aria-label="Cor" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
        <button className="btn-primary">Adicionar</button>
      </form>
      {msg && <Msg ok={false} text={msg} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["expense", "income"] as const).map((t) => (
          <div key={t}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t === "expense" ? "Despesas" : "Receitas"}</h3>
            <ul className="space-y-1">
              {categories.filter((c) => c.type === t).map((c) => (
                <li key={c.id} className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
                  </span>
                  <button className="text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100" onClick={() => remove(c)} aria-label={`Excluir ${c.name}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecuritySection() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>({ ok: true, text: "" });
  const [delMsg, setDelMsg] = useState("");

  async function changePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("PATCH", "/api/account", { currentPassword: f.get("current"), newPassword: f.get("next") });
      form.reset();
      setMsg({ ok: true, text: "Senha alterada." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro." });
    }
  }

  async function del(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("Excluir sua conta e TODOS os seus dados permanentemente?")) return;
    const f = new FormData(e.currentTarget);
    try {
      await api("DELETE", "/api/account", { password: f.get("password") });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setDelMsg(err instanceof Error ? err.message : "Erro.");
    }
  }

  return (
    <section className="card space-y-6">
      <form onSubmit={changePw} className="space-y-3">
        <h2 className="font-semibold text-slate-900">Alterar senha</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pw-cur">Senha atual</label>
            <input id="pw-cur" name="current" type="password" className="input" required autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">Nova senha</label>
            <input id="pw-new" name="next" type="password" className="input" required minLength={8} autoComplete="new-password" />
          </div>
        </div>
        <Msg {...msg} />
        <button className="btn-secondary">Alterar senha</button>
      </form>
      <form onSubmit={del} className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-semibold text-red-700">Excluir conta</h2>
        <p className="text-sm text-slate-500">Remove permanentemente seu cadastro, lançamentos, orçamentos, dívidas e a chave do Google.</p>
        <div className="max-w-xs">
          <label className="label" htmlFor="del-pw">Confirme sua senha</label>
          <input id="del-pw" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <Msg ok={false} text={delMsg} />
        <button className="btn-danger">Excluir minha conta</button>
      </form>
    </section>
  );
}

function ApkSection() {
  const [copied, setCopied] = useState(false);

  function copyCommand() {
    navigator.clipboard.writeText("npm run build:apk");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <Smartphone size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Aplicativo para Celular (APK / PWA)</h2>
          <p className="text-sm text-slate-500">
            Instale o My Finances no seu celular Android ou iOS para ter atalhos rápidos, tela cheia, notificações e suporte a compartilhamento de comprovantes.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Opção 1 · Instalação Direta (Recomendado)</h3>
          <p className="text-xs text-slate-600">
            Abra este site no <strong>Google Chrome</strong> do seu celular Android e toque nos <strong>3 pontinhos ⋮</strong> &rarr; <strong>&ldquo;Instalar aplicativo&rdquo;</strong>.
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">✓ Sem precisar baixar arquivos externos. Atualiza automaticamente!</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Opção 2 · Gerar arquivo .APK nativo</h3>
          <p className="text-xs text-slate-600">
            Você pode gerar um arquivo <code>.apk</code> assinado pronto para instalar ou publicar com o Google Bubblewrap:
          </p>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-400">
            <span>npm run build:apk</span>
            <button onClick={copyCommand} className="text-slate-400 hover:text-white">
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Ou execute o script <code>scripts/build-apk.bat</code> na raiz do projeto.</p>
        </div>
      </div>
    </section>
  );
}

function AppearanceSection() {
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Aparência e Tema</h2>
          <p className="text-sm text-slate-500">Alterne entre o tema visual claro e escuro conforme sua preferência.</p>
        </div>
        <ThemeToggle className="border border-slate-200 dark:border-slate-700 px-3 py-1.5" />
      </div>
    </section>
  );
}

export function SettingsClient({ hasKey, model, categories }: { hasKey: boolean; model: string; categories: Cat[] }) {
  return (
    <div className="space-y-5">
      <AppearanceSection />
      <GeminiSection hasKey={hasKey} model={model} />
      <ApkSection />
      <CategorySection categories={categories} />
      <SecuritySection />
    </div>
  );
}
