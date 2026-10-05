"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Undo2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { brl, fmtDate } from "@/lib/format";

type Result = {
  kind: string;
  entity: "transaction" | "debt";
  id: string | null;
  description: string;
  issuer: string | null;
  amountCents: number;
  date: string;
  type: "expense" | "income";
  status: "paid" | "pending";
  categoryId: string | null;
  categoryName: string | null;
  duplicate: boolean;
  undone?: boolean;
};

type Job = {
  key: string;
  name: string;
  preview: string | null;
  state: "queued" | "working" | "done" | "error";
  error?: string;
  results: Result[];
  saved: boolean;
};

const KIND: Record<string, string> = {
  fatura: "Fatura",
  boleto: "Boleto",
  divida: "Dívida",
  comprovante: "Comprovante",
  receita: "Receita",
  outro: "Lançamento",
};

const MAX_BYTES = 3_800_000;

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

/** Reduz imagens grandes (limite de 4,5 MB do corpo na Vercel) mantendo legibilidade para OCR. */
async function prepare(file: File): Promise<{ mimeType: string; data: string; preview: string | null }> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_BYTES) throw new Error("PDF muito grande (máx. ~3,8 MB).");
    return { mimeType: file.type, data: (await readAsDataURL(file)).split(",")[1], preview: null };
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.88);
    return { mimeType: "image/jpeg", data: url.split(",")[1], preview: url };
  } catch {
    // formatos que o navegador não decodifica (ex.: HEIC): envia o original se couber
    if (file.size > MAX_BYTES) throw new Error("Imagem em formato não suportado ou muito grande.");
    return { mimeType: file.type || "image/jpeg", data: (await readAsDataURL(file)).split(",")[1], preview: null };
  }
}

export function ImportClient({ hasKey }: { hasKey: boolean }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [auto, setAuto] = useState(true);
  const [drag, setDrag] = useState(false);
  const queue = useRef<{ key: string; file: File; save: boolean }[]>([]);
  const running = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((key: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j))), []);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const { key, file, save } = queue.current.shift()!;
      patch(key, { state: "working" });
      try {
        const prep = await prepare(file);
        patch(key, { preview: prep.preview });
        const out = await api<{ results: Result[]; saved: boolean }>("POST", "/api/ocr", { mimeType: prep.mimeType, data: prep.data, save });
        patch(key, { state: "done", results: out.results, saved: out.saved });
        router.refresh();
      } catch (e) {
        patch(key, { state: "error", error: e instanceof Error ? e.message : "Erro ao processar." });
      }
    }
    running.current = false;
  }, [patch, router]);

  const add = useCallback(
    (files: File[]) => {
      const ok = files.filter((f) => /^image\//.test(f.type) || f.type === "application/pdf");
      if (!ok.length) return;
      const newJobs: Job[] = ok.map((f, i) => ({
        key: `${Date.now()}-${i}-${f.name}`,
        name: f.name || "print colado",
        preview: null,
        state: "queued",
        results: [],
        saved: auto,
      }));
      setJobs((js) => [...newJobs, ...js]);
      newJobs.forEach((j, i) => queue.current.push({ key: j.key, file: ok[i], save: auto }));
      void run();
    },
    [auto, run],
  );

  // Ctrl+V de prints
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  async function undo(jobKey: string, idx: number) {
    const job = jobs.find((j) => j.key === jobKey)!;
    const r = job.results[idx];
    if (!r.id) return;
    await api("DELETE", r.entity === "debt" ? `/api/debts/${r.id}` : `/api/transactions/${r.id}`);
    setJobs((js) => js.map((j) => (j.key === jobKey ? { ...j, results: j.results.map((x, i) => (i === idx ? { ...x, id: null, undone: true } : x)) } : j)));
    router.refresh();
  }

  async function confirm(jobKey: string, idx: number) {
    const job = jobs.find((j) => j.key === jobKey)!;
    const r = job.results[idx];
    const out =
      r.entity === "debt"
        ? await api<{ id: string }>("POST", "/api/debts", { name: r.description, creditor: r.issuer, totalCents: r.amountCents, dueDate: r.date })
        : await api<{ id: string }>("POST", "/api/transactions", {
            type: r.type,
            description: r.description,
            amountCents: r.amountCents,
            date: r.date,
            status: r.status,
            categoryId: r.categoryId,
            source: "ocr",
          });
    setJobs((js) => js.map((j) => (j.key === jobKey ? { ...j, results: j.results.map((x, i) => (i === idx ? { ...x, id: out.id } : x)) } : j)));
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {!hasKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Para ler prints você precisa cadastrar sua chave de API do Google em{" "}
          <Link href="/configuracoes" className="font-semibold underline">Configurações</Link>.
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          drag ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-500 hover:bg-brand-50/40",
        )}
      >
        <ImagePlus size={36} className="text-brand-600" />
        <p className="font-semibold text-slate-900">Arraste prints aqui, clique para escolher ou cole com Ctrl+V</p>
        <p className="text-sm text-slate-500">Faturas de cartão, boletos, contas, extratos e dívidas · JPG, PNG, WEBP ou PDF</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4 accent-emerald-600" />
        Registrar automaticamente os lançamentos extraídos <span className="text-slate-400">(desmarque para revisar antes)</span>
      </label>

      <div className="space-y-3">
        {jobs.map((j) => (
          <div key={j.key} className="card !p-4">
            <div className="flex items-start gap-3">
              {j.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={j.preview} alt="" className="size-16 shrink-0 rounded-lg border border-slate-200 object-cover object-top" />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs text-slate-400">arquivo</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{j.name}</p>
                {j.state === "queued" && <p className="text-xs text-slate-500">Na fila...</p>}
                {j.state === "working" && (
                  <p className="flex items-center gap-1.5 text-xs text-brand-700">
                    <Loader2 size={13} className="animate-spin" /> Lendo com IA...
                  </p>
                )}
                {j.state === "error" && (
                  <p className="flex items-start gap-1.5 text-xs text-red-600">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" /> {j.error}
                  </p>
                )}
                {j.state === "done" && j.results.length === 0 && (
                  <p className="text-xs text-slate-500">Nenhuma informação financeira encontrada nesta imagem.</p>
                )}
              </div>
            </div>

            {j.results.length > 0 && (
              <ul className="mt-3 space-y-2">
                {j.results.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="truncate">{r.description}</span>
                        <span className="badge bg-slate-200 text-slate-700">{KIND[r.kind] ?? r.kind}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Vence {fmtDate(r.date)} · {r.entity === "debt" ? "Dívidas" : r.categoryName ?? "Sem categoria"} ·{" "}
                        {r.status === "paid" ? "pago" : "pendente"}
                      </p>
                    </div>
                    <span className={clsx("text-sm font-bold tabular-nums", r.type === "income" ? "text-brand-700" : "text-slate-900")}>
                      {r.type === "income" ? "+" : "-"} {brl(r.amountCents)}
                    </span>
                    {r.duplicate ? (
                      <span className="badge bg-amber-100 text-amber-800">Já existia · ignorado</span>
                    ) : r.undone ? (
                      <span className="badge bg-slate-200 text-slate-600">Desfeito</span>
                    ) : r.id ? (
                      <>
                        <span className="badge bg-brand-100 text-brand-700">
                          <CheckCircle2 size={12} className="mr-1" /> Registrado
                        </span>
                        <button className="btn-ghost btn-sm" onClick={() => undo(j.key, i)}>
                          <Undo2 size={13} /> Desfazer
                        </button>
                      </>
                    ) : (
                      <button className="btn-primary btn-sm" onClick={() => confirm(j.key, i)}>Registrar</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
