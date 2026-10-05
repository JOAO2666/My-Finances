"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Sparkles, X, Check, Share2, HelpCircle } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registrado:", reg.scope);
        })
        .catch((err) => {
          console.warn("Falha ao registrar Service Worker:", err);
        });
    }

    // Check if running in standalone mode (already installed as APK/PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt on Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds on non-installed mobile/desktop
      const timer = setTimeout(() => setShowBanner(true), 2500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      triggerHaptic("success", true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    triggerHaptic("pop");
    if (!deferredPrompt) {
      setShowHelpModal(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        triggerHaptic("success", true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch {
      setShowHelpModal(true);
    }
  }

  return (
    <>
      {/* Floating Install Banner for Android / Mobile */}
      {showBanner && !isInstalled && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white/95 p-3.5 shadow-xl shadow-slate-900/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white shadow-xs">
                <Smartphone size={20} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Instalar App My Finances</h4>
                <p className="text-[11px] text-slate-500">Tela cheia, atalhos rápidos e notificações.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleInstall}
                className="btn-primary py-1.5 px-3 text-xs font-semibold shadow-xs active:scale-95"
              >
                <Download size={13} /> Instalar
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Dispensar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual APK / Install Instructions Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700">
                  <Smartphone size={18} />
                </span>
                <h3 className="font-semibold text-slate-900">Como instalar no Celular (APK / PWA)</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white font-bold text-[10px]">
                  1
                </span>
                <p>
                  No seu celular Android ou iOS, abra o site no navegador <strong>Google Chrome</strong> ou <strong>Safari</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white font-bold text-[10px]">
                  2
                </span>
                <p>
                  Toque no menu do navegador (os <strong>três pontinhos ⋮</strong> no Chrome ou <strong>Compartilhar</strong> no Safari).
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white font-bold text-[10px]">
                  3
                </span>
                <p>
                  Selecione <strong>&ldquo;Instalar aplicativo&rdquo;</strong> ou <strong>&ldquo;Adicionar à tela de início&rdquo;</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <Sparkles size={14} className="text-emerald-600" />
                Vantagens do App Instalado:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-800">
                <li>Abre em tela cheia idêntico a um APK nativo da Play Store.</li>
                <li>Permite compartilhar comprovantes e prints direto para o app.</li>
                <li>Detecção automática de Pix e notificações.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="btn-primary w-full py-2 text-xs"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
