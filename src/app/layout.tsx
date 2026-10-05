import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Moneta — finanças pessoais com IA", template: "%s · Moneta" },
  description:
    "Controle seu dinheiro com orçamento por categoria, leitura automática de faturas e boletos por print (Gemini) e relatórios em PDF e Excel.",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
