"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  KeyRound,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { api } from "@/lib/client";
import { ThemeToggle } from "./theme-toggle";

type Cat = { id: string; name: string; type: "expense" | "income"; color: string };

function Msg({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${
        ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {text}
    </p>
  );
}

const PRESET_AVATARS = [
  {
    id: "diamond",
    label: "Diamante Fintech",
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%23a3ff12"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="%230f172a"/><polygon points="50,15 85,45 50,85 15,45" fill="url(%23g)"/><polygon points="50,15 85,45 50,55" fill="%23ffffff" opacity="0.35"/><polygon points="50,85 85,45 50,55" fill="%23000000" opacity="0.25"/></svg>`,
  },
  {
    id: "albert",
    label: "Albert (Sentinela)",
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%231e1b4b"/><path d="M50 20 L80 32 V55 C80 72 50 85 50 85 C50 85 20 72 20 55 V32 Z" fill="%236366f1"/><circle cx="50" cy="50" r="12" fill="%23e0e7ff"/></svg>`,
  },
  {
    id: "marie",
    label: "Marie (Analista)",
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%233b0764"/><circle cx="50" cy="50" r="32" fill="%23a855f7"/><rect x="36" y="55" width="8" height="20" rx="2" fill="%23faf5ff"/><rect x="46" y="42" width="8" height="33" rx="2" fill="%23faf5ff"/><rect x="56" y="30" width="8" height="45" rx="2" fill="%23faf5ff"/></svg>`,
  },
  {
    id: "galileu",
    label: "Galileu (Estrategista)",
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%23022c22"/><circle cx="50" cy="50" r="32" fill="%23059669"/><polygon points="50,22 57,43 78,50 57,57 50,78 43,57 22,50 43,43" fill="%23d1fae5"/></svg>`,
  },
  {
    id: "computer",
    label: "Pierre Computer",
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%2318181b"/><rect x="30" y="30" width="40" height="40" rx="8" fill="%23f59e0b"/><rect x="40" y="40" width="20" height="20" rx="4" fill="%23fef3c7"/><line x1="50" y1="18" x2="50" y2="30" stroke="%23f59e0b" stroke-width="4"/><line x1="50" y1="70" x2="50" y2="82" stroke="%23f59e0b" stroke-width="4"/><line x1="18" y1="50" x2="30" y2="50" stroke="%23f59e0b" stroke-width="4"/><line x1="70" y1="50" x2="82" stroke="%23f59e0b" stroke-width="4"/></svg>`,
  },
];

function ProfileSection({
  initialName,
  email,
  initialAvatar,
}: {
  initialName: string;
  email: string;
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>({ ok: true, text: "" });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMsg({ ok: false, text: "Selecione um arquivo de imagem válido (PNG, JPEG ou WebP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setAvatar(compressed);
          setMsg({ ok: true, text: "Foto carregada. Clique em 'Salvar alterações' para confirmar." });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: true, text: "" });
    try {
      await api("PUT", "/api/account", {
        name: name.trim() || undefined,
        avatarUrl: avatar,
      });
      setMsg({ ok: true, text: "Foto e dados do perfil salvos com sucesso!" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro ao salvar perfil." });
    } finally {
      setBusy(false);
    }
  }

  function handleRemovePhoto() {
    setAvatar(null);
    setMsg({ ok: true, text: "Foto removida. Clique em 'Salvar alterações' para aplicar." });
  }

  return (
    <section className="card space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <User size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Foto e Dados da Conta</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Personalize sua foto de perfil exibida no menu, topo do app e relatórios.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar Preview */}
          <div className="relative group self-center sm:self-start">
            <div className="relative size-24 sm:size-28 overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-slate-100 shadow-inner dark:bg-slate-800">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Foto de perfil" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-gradient-to-tr from-slate-900 to-slate-800 text-2xl font-bold uppercase text-[#a3ff12] dark:from-slate-800 dark:to-slate-700">
                  {name ? name.slice(0, 2) : "ME"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-emerald-600 active:scale-95 dark:bg-white dark:text-slate-950 dark:hover:bg-[#a3ff12]"
              title="Carregar foto"
              aria-label="Carregar foto"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Action buttons and Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Upload size={14} /> Carregar foto do celular / PC
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="btn-ghost text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <RotateCcw size={14} /> Remover foto
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formatos aceitos: JPG, PNG, WebP. Redimensionamento automático de alta performance no seu navegador.
            </p>

            {/* Presets */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ou escolha um emblema temático:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRESET_AVATARS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAvatar(p.dataUrl)}
                    title={p.label}
                    className="relative size-10 overflow-hidden rounded-xl border border-slate-200 transition hover:scale-105 hover:border-emerald-500 active:scale-95 dark:border-slate-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt={p.label} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div>
            <label className="label" htmlFor="user-name">
              Seu Nome Completo / Apelido
            </label>
            <input
              id="user-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
            />
          </div>

          <div>
            <label className="label" htmlFor="user-email">
              E-mail de Acesso
            </label>
            <input
              id="user-email"
              className="input opacity-70 cursor-not-allowed"
              value={email}
              disabled
              title="Para alterar seu e-mail, entre em contato com o suporte."
            />
          </div>
        </div>

        <Msg {...msg} />

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Salvando..." : "Salvar alterações do perfil"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ExportSection() {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");

  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  function setThisMonth() {
    setFrom(`${year}-${monthStr}-01`);
    setTo(now.toISOString().slice(0, 10));
  }

  function setThisYear() {
    setFrom(`${year}-01-01`);
    setTo(now.toISOString().slice(0, 10));
  }

  function setAllTime() {
    setFrom("2020-01-01");
    setTo("2030-12-31");
  }

  return (
    <section className="card space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Download size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Exportar Dados do App</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faça download completo dos seus lançamentos, contas, relatórios e backup estruturado a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* Date filter bar */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Filtrar período para exportação:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={setThisMonth}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Mês atual
            </button>
            <button
              type="button"
              onClick={setThisYear}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Ano atual
            </button>
            <button
              type="button"
              onClick={setAllTime}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Histórico completo
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 min-w-12" htmlFor="exp-from">
              De:
            </label>
            <input
              id="exp-from"
              type="date"
              className="input !h-9 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 min-w-12" htmlFor="exp-to">
              Até:
            </label>
            <input
              id="exp-to"
              type="date"
              className="input !h-9 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Excel */}
        <a
          href={`/api/export/xlsx?from=${from}&to=${to}`}
          download
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Planilha Excel (.xlsx)</h3>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Completo
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Abas individuais com Resumo contábil, Receitas, Despesas, Orçamentos e Dívidas.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
            <span>Baixar planilha Excel</span>
            <ArrowRight size={14} />
          </div>
        </a>

        {/* CSV */}
        <a
          href={`/api/export/csv?from=${from}&to=${to}`}
          download
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-500"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <FileText size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Formato Universal (.csv)</h3>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  Universal
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Separador ponto-e-vírgula pronto para abrir em qualquer software, Google Planilhas ou Python.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Baixar arquivo CSV</span>
            <ArrowRight size={14} />
          </div>
        </a>

        {/* PDF */}
        <a
          href={`/api/export/pdf?from=${from}&to=${to}`}
          download
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-rose-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-rose-500"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 group-hover:scale-105 transition-transform">
              <FileText size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Relatório PDF (.pdf)</h3>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                  Impressão
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Extrato com diagramação gráfica, taxa de economia e demonstrativo financeiro limpo.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:underline">
            <span>Baixar relatório em PDF</span>
            <ArrowRight size={14} />
          </div>
        </a>

        {/* JSON Backup */}
        <a
          href={`/api/export/json?from=${from}&to=${to}`}
          download
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-purple-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-purple-500"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <Database size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Backup Estruturado (.json)</h3>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                  Snapshot 100%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Exporta todas as contas bancárias, transações, categorias, orçamentos, metas e dívidas.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">
            <span>Baixar backup JSON</span>
            <ArrowRight size={14} />
          </div>
        </a>
      </div>
    </section>
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
      setMsg({ ok: true, text: "Chave validada e salva com sucesso. A IA e o OCR já estão ativos." });
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
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <KeyRound size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Chave de API do Google (Gemini)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Usada para leitura de comprovantes OCR e agentes inteligentes. Fica criptografada no banco e nunca é exposta.{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-emerald-400"
            >
              Gerar chave gratuita no AI Studio <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </div>
      {hasKey && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-emerald-400">
          <CheckCircle2 size={16} /> Chave configurada e ativa
        </p>
      )}
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label" htmlFor="gk">
            {hasKey ? "Substituir chave (opcional)" : "Chave de API"}
          </label>
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
          <label className="label" htmlFor="gm">
            Modelo
          </label>
          <input
            id="gm"
            list="models"
            className="input"
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
            required
          />
          <datalist id="models">
            <option value="gemini-2.5-flash" />
            <option value="gemini-2.5-flash-lite" />
            <option value="gemini-2.5-pro" />
            <option value="gemini-2.0-flash" />
          </datalist>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Recomendado: gemini-2.5-flash (ultra-rápido para OCR de comprovantes e respostas financeiras).
          </p>
        </div>
        <Msg {...msg} />
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Validando..." : "Validar e salvar chave"}
          </button>
          {hasKey && (
            <button type="button" className="btn-secondary text-red-600 dark:text-red-400" onClick={remove}>
              Remover chave
            </button>
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
      <h2 className="font-semibold text-slate-900 dark:text-white">Categorias Financeiras</h2>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="cn">
            Nova categoria
          </label>
          <input
            id="cn"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </div>
        <select
          aria-label="Tipo"
          className="input !w-auto"
          value={type}
          onChange={(e) => setType(e.target.value as "expense" | "income")}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <input
          type="color"
          aria-label="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
        />
        <button className="btn-primary">Adicionar</button>
      </form>
      {msg && <Msg ok={false} text={msg} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["expense", "income"] as const).map((t) => (
          <div key={t}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t === "expense" ? "Despesas" : "Receitas"}
            </h3>
            <ul className="space-y-1">
              {categories
                .filter((c) => c.type === t)
                .map((c) => (
                  <li
                    key={c.id}
                    className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
                    </span>
                    <button
                      className="text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:text-red-400"
                      onClick={() => remove(c)}
                      aria-label={`Excluir ${c.name}`}
                    >
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
      setMsg({ ok: true, text: "Senha alterada com sucesso." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erro." });
    }
  }

  async function del(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("Excluir sua conta e TODOS os seus dados permanentemente? Esta ação é irreversível.")) return;
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
        <h2 className="font-semibold text-slate-900 dark:text-white">Alterar Senha</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pw-cur">
              Senha atual
            </label>
            <input
              id="pw-cur"
              name="current"
              type="password"
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">
              Nova senha
            </label>
            <input
              id="pw-new"
              name="next"
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Msg {...msg} />
        <button className="btn-secondary">Atualizar senha</button>
      </form>
      <form onSubmit={del} className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <h2 className="font-semibold text-red-700 dark:text-red-400">Zona de Perigo · Excluir Conta</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Remove permanentemente seu cadastro, contas, lançamentos, orçamentos, dívidas e a chave do Google.
        </p>
        <div className="max-w-xs">
          <label className="label" htmlFor="del-pw">
            Confirme sua senha
          </label>
          <input
            id="del-pw"
            name="password"
            type="password"
            className="input"
            required
            autoComplete="current-password"
          />
        </div>
        <Msg ok={false} text={delMsg} />
        <button className="btn-danger">Excluir minha conta permanentemente</button>
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
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <Smartphone size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Aplicativo para Celular (APK / PWA)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Instale o app no seu celular Android ou iOS para atalhos rápidos, tela cheia e importação instantânea de comprovantes.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider dark:text-slate-200">
            Opção 1 · Instalação Direta (Recomendado)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Abra este site no <strong>Google Chrome</strong> do seu celular Android e toque nos <strong>3 pontinhos ⋮</strong> &rarr; <strong>&ldquo;Instalar aplicativo&rdquo;</strong>.
          </p>
          <p className="text-[11px] text-emerald-700 font-medium dark:text-emerald-400">
            ✓ Sem precisar baixar arquivos externos. Atualiza automaticamente!
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider dark:text-slate-200">
            Opção 2 · Gerar arquivo .APK nativo
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Você pode gerar um arquivo <code>.apk</code> assinado pronto para instalar com o Google Bubblewrap:
          </p>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-400 dark:bg-black">
            <span>npm run build:apk</span>
            <button onClick={copyCommand} className="text-slate-400 hover:text-white">
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ou execute o script <code>scripts/build-apk.bat</code> na raiz do projeto.
          </p>
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Aparência e Tema</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Alterne entre o tema visual claro e escuro conforme sua preferência.
          </p>
        </div>
        <ThemeToggle className="border border-slate-200 dark:border-slate-700 px-3 py-1.5" />
      </div>
    </section>
  );
}

function PierreChatSection() {
  return (
    <section className="card space-y-4 border-2 border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-[#a3ff12] shadow-md">
            <Bot size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white">Interface Pierre Chat (pierre.finance/chat)</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-[#a3ff12]">
                Clone de Alta Fidelidade
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Interface experimental clone de <code>pierre.finance/chat</code>. Conectada diretamente ao seu banco de dados com os 4 agentes especializados (Albert, Marie, Galileu e Pierre Computer) e suporte a anexar prints para OCR direto na conversa.
            </p>
          </div>
        </div>

        <Link
          href="/pierre-chat"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white dark:bg-[#a3ff12] dark:text-black shadow-md hover:opacity-95 active:scale-95 transition-all"
        >
          <Sparkles size={14} />
          <span>Testar Pierre Chat</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 pt-1">
        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3 text-xs">
          <span className="font-bold text-blue-600 dark:text-blue-400">Albert</span>
          <p className="text-[11px] text-slate-500 mt-1">Vigia diário de contas a vencer e cobranças estranhas.</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3 text-xs">
          <span className="font-bold text-purple-600 dark:text-purple-400">Marie</span>
          <p className="text-[11px] text-slate-500 mt-1">Análise comportamental quinzenal de consumo.</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3 text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Galileu</span>
          <p className="text-[11px] text-slate-500 mt-1">Estrategista mensal, regra 50-30-20 e metas.</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3 text-xs">
          <span className="font-bold text-amber-600 dark:text-amber-400">Pierre Computer</span>
          <p className="text-[11px] text-slate-500 mt-1">Simulador de compras parceladas, investimentos e dívidas.</p>
        </div>
      </div>
    </section>
  );
}

export function SettingsClient({
  hasKey,
  model,
  categories,
  userName = "Você",
  userEmail = "",
  userAvatar = null,
}: {
  hasKey: boolean;
  model: string;
  categories: Cat[];
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
}) {
  return (
    <div className="space-y-5">
      <ProfileSection initialName={userName} email={userEmail} initialAvatar={userAvatar} />
      <ExportSection />
      <PierreChatSection />
      <AppearanceSection />
      <GeminiSection hasKey={hasKey} model={model} />
      <ApkSection />
      <CategorySection categories={categories} />
      <SecuritySection />
    </div>
  );
}
