"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, CheckCircle2, Clipboard, Landmark, Loader2, Sparkles, X } from "lucide-react";
import { parsePixNotification, type ParsedPixNotification } from "@/lib/pix-parser";
import { brl } from "@/lib/format";
import { api } from "@/lib/client";
import { triggerHaptic } from "@/lib/haptics";

export function PixNotificationDetector() {
  const router = useRouter();
  const [detected, setDetected] = useState<ParsedPixNotification | null>(null);
  const [lastProcessedText, setLastProcessedText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [manualText, setManualText] = useState("");

  // Inspect text and trigger notification
  function handleInspectText(text: string) {
    if (!text || text === lastProcessedText) return;
    const parsed = parsePixNotification(text);
    if (parsed) {
      setLastProcessedText(text);
      setDetected(parsed);
      triggerHaptic("pop", true);
    }
  }

  // Auto-check clipboard when user returns to app (like Minhas Finanças)
  useEffect(() => {
    async function checkClipboard() {
      if (typeof window === "undefined" || !navigator.clipboard?.readText) return;
      try {
        // Only read if window is focused
        if (document.hasFocus()) {
          const text = await navigator.clipboard.readText();
          handleInspectText(text);
        }
      } catch {
        // Clipboard read permission might require explicit user gesture in some browsers
      }
    }

    const onFocus = () => {
      checkClipboard();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkClipboard();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [lastProcessedText]);

  // Import transaction automatically
  async function importPix(notification: ParsedPixNotification) {
    setSaving(true);
    triggerHaptic("tap");
    try {
      await api("POST", "/api/transactions", {
        type: notification.type,
        description: notification.description,
        amountCents: notification.amountCents,
        date: notification.date,
        status: "paid",
        notes: `Importado automaticamente via notificação de ${notification.bankName}`,
      });

      triggerHaptic("success", true);
      setSuccessToast(`Lançamento de ${brl(notification.amountCents)} importado com sucesso!`);
      setDetected(null);
      router.refresh();

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch {
      triggerHaptic("error", true);
    } finally {
      setSaving(false);
    }
  }

  function simulateNubankNotification() {
    setShowPasteModal(false);
    handleInspectText("Nubank: Transferência de R$ 48,50 enviada para Padaria Central pelo Pix com sucesso.");
  }

  function simulateInterNotification() {
    setShowPasteModal(false);
    handleInspectText("Banco Inter: Pix enviado no valor de R$ 125,00 para Posto Ipiranga.");
  }

  return (
    <>
      {/* Floating Heads-Up Bank Notification Banner (Like Android Minhas Finanças) */}
      {detected && (
        <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-white/95 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white shadow-md shadow-brand-500/20 animate-pulse">
                  <BellRing size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                      {detected.bankName} Detectado
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Pix Automático
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {detected.description}
                  </h3>
                  <p className="text-base font-bold text-slate-900 tabular-nums">
                    {brl(detected.amountCents)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-90 transition"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => importPix(detected)}
                disabled={saving}
                className="btn-primary flex-1 justify-center py-2 text-xs font-semibold shadow-sm active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Importando...
                  </>
                ) : (
                  <>
                    <Check size={15} /> Importar Lançamento Agora
                  </>
                )}
              </button>
              <button
                onClick={() => setDetected(null)}
                className="btn-secondary py-2 text-xs font-medium text-slate-600 active:scale-95"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Floating Toast */}
      {successToast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-2.5 rounded-full border border-emerald-200 bg-emerald-800 text-white px-5 py-2.5 text-xs font-semibold shadow-lg">
            <CheckCircle2 size={16} className="text-emerald-300" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Discreet Quick Paste / Detect Button on Mobile & Desktop */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-20">
        <button
          onClick={() => setShowPasteModal(true)}
          title="Detectar Pix copiado ou notificação bancária"
          className="group flex items-center gap-2 rounded-full border border-brand-200 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md transition hover:border-brand-400 hover:text-brand-700 active:scale-90"
        >
          <span className="grid size-5 place-items-center rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-100">
            <Clipboard size={12} />
          </span>
          <span className="hidden sm:inline">Colar Pix / Notificação</span>
        </button>
      </div>

      {/* Manual Paste / Test Simulation Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700">
                  <Landmark size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">Reconhecer Pix / Notificação</h3>
                  <p className="text-xs text-slate-500">Cole a mensagem do banco ou comprovante</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Ex: Nubank: Você transferiu R$ 35,00 para Padaria pelo Pix..."
              className="input text-xs"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                onClick={() => {
                  if (manualText) {
                    handleInspectText(manualText);
                    setShowPasteModal(false);
                    setManualText("");
                  }
                }}
                disabled={!manualText.trim()}
                className="btn-primary btn-sm flex-1"
              >
                <Sparkles size={14} /> Detectar e Importar
              </button>

              <button
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    setManualText(clip);
                    handleInspectText(clip);
                    setShowPasteModal(false);
                  } catch {
                    // Clipboard permission fallback
                  }
                }}
                className="btn-secondary btn-sm"
              >
                <Clipboard size={14} /> Colar
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-600 mb-2">Testar simulação rápida:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={simulateNubankNotification}
                  className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 active:scale-95 transition"
                >
                  <span className="size-2 rounded-full bg-purple-600 mr-1.5" />
                  Pix Nubank R$ 48,50
                </button>
                <button
                  type="button"
                  onClick={simulateInterNotification}
                  className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-100 active:scale-95 transition"
                >
                  <span className="size-2 rounded-full bg-orange-600 mr-1.5" />
                  Pix Inter R$ 125,00
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
