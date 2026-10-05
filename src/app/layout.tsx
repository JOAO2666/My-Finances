import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { ClickFeedback } from "@/components/click-ripple";
import { NavigationProgress } from "@/components/navigation-progress";
import { PixNotificationDetector } from "@/components/pix-detector";
import { PwaInstaller } from "@/components/pwa-installer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "My Finances — Finanças Pessoais com IA", template: "%s · My Finances" },
  description:
    "Controle financeiro inteligente inspirado no Pierre e Minhas Finanças: OCR de comprovantes com Gemini, multi-agentes de IA, cartões, metas e detecção de Pix.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Finances",
  },
  applicationName: "My Finances",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="My Finances" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ClickFeedback />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <PixNotificationDetector />
        <PwaInstaller />
        {children}
      </body>
    </html>
  );
}
