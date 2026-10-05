import Link from "next/link";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { brl, currentMonth, fmtDate, isDate, monthRange, shiftMonth, today } from "@/lib/format";
import { buildReport } from "@/lib/report";

export const metadata = { title: "Relatórios" };

type SP = Promise<{ from?: string; to?: string }>;

export default async function RelatoriosPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const cur = monthRange(currentMonth());
  const from = isDate(sp.from) ? sp.from : cur.from;
  const to = isDate(sp.to) && sp.to >= from ? sp.to : cur.to;
  const r = await buildReport(user.id, user.name, from, to);
  const s = r.summary;

  const prev = monthRange(shiftMonth(currentMonth(), -1));
  const last3 = { from: monthRange(shiftMonth(currentMonth(), -2)).from, to: cur.to };
  const year = { from: `${today().slice(0, 4)}-01-01`, to: `${today().slice(0, 4)}-12-31` };
  const presets = [
    { label: "Este mês", ...cur },
    { label: "Mês anterior", ...prev },
    { label: "Últimos 3 meses", ...last3 },
    { label: "Este ano", ...year },
  ];
  const qs = `from=${from}&to=${to}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">Escolha o período e exporte em PDF ou Excel.</p>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/relatorios?from=${p.from}&to=${p.to}`}
              className={p.from === from && p.to === to ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="label" htmlFor="from">De</label>
            <input id="from" type="date" name="from" defaultValue={from} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="to">Até</label>
            <input id="to" type="date" name="to" defaultValue={to} className="input" required />
          </div>
          <button className="btn-secondary">Aplicar</button>
        </form>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <a href={`/api/export/pdf?${qs}`} download className="btn-primary">
            <FileText size={16} /> Baixar PDF
          </a>
          <a href={`/api/export/xlsx?${qs}`} download className="btn-secondary">
            <FileSpreadsheet size={16} /> Baixar Excel (.xlsx)
          </a>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold text-slate-900">
          Prévia · {fmtDate(from)} a {fmtDate(to)}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Receitas", s.income, "text-brand-700"],
            ["Despesas", s.expense, "text-red-600"],
            ["Saldo realizado", s.balanceRealized, s.balanceRealized >= 0 ? "text-slate-900" : "text-red-600"],
            ["Saldo previsto", s.balanceForecast, s.balanceForecast >= 0 ? "text-blue-700" : "text-red-600"],
          ].map(([l, v, c]) => (
            <div key={String(l)} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{l}</p>
              <p className={`text-lg font-bold tabular-nums ${c}`}>{brl(Number(v))}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Despesas por categoria</h3>
            {r.expenseByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">Sem despesas no período.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {r.expenseByCategory.map((c) => (
                  <li key={c.categoryId ?? "none"} className="flex justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="tabular-nums text-slate-700">{brl(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Receitas por categoria</h3>
            {r.incomeByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">Sem receitas no período.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {r.incomeByCategory.map((c) => (
                  <li key={c.categoryId ?? "none"} className="flex justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="tabular-nums text-slate-700">{brl(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Download size={12} /> O arquivo inclui {r.transactions.length} lançamentos, orçamentos e dívidas.
        </p>
      </section>
    </div>
  );
}
