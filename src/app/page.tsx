import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, FileSpreadsheet, MessageCircle, PiggyBank, ShieldCheck, Wallet } from "lucide-react";
import { getUser } from "@/lib/auth";

const features = [
  { icon: Camera, title: "Leitura de prints por IA", text: "Envie a captura de uma fatura, boleto ou dívida. O Gemini extrai valor, vencimento e descrição e já lança para você." },
  { icon: MessageCircle, title: "Assistente em conversa", text: "Diga “gastei 45 no mercado” ou pergunte “quanto gastei com delivery?”. Estilo Pierre: finanças por chat." },
  { icon: PiggyBank, title: "Orçamento por categoria", text: "Defina limites mensais, acompanhe o consumo e receba alertas visuais antes de estourar." },
  { icon: Wallet, title: "Contas a pagar e dívidas", text: "Vencimentos, atrasos, saldo devedor e pagamentos parciais em um só lugar." },
  { icon: FileSpreadsheet, title: "Relatórios PDF e Excel", text: "Exporte o período que quiser com resumo, categorias, orçamentos, dívidas e todos os lançamentos." },
  { icon: ShieldCheck, title: "Sua chave, seus dados", text: "Use sua própria chave de API do Google. Ela é guardada criptografada e nunca volta ao navegador." },
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 text-xl font-bold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">M</span> Moneta
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Entrar</Link>
          <Link href="/register" className="btn-primary">Criar conta grátis</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-16 pt-12 text-center">
        <span className="badge bg-brand-100 text-brand-700">100% gratuito · roda na Vercel</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Controle financeiro que se <span className="text-brand-600">preenche sozinho</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Tire um print da fatura, do boleto ou da dívida e deixe a IA lançar tudo. Acompanhe orçamento, contas a pagar e
          converse com um assistente financeiro — sincronizado em todos os dispositivos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Começar agora</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Já tenho conta</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={20} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">Moneta · feito com Next.js, Turso e Gemini</footer>
    </main>
  );
}
