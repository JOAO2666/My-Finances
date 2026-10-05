"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl, monthShort } from "@/lib/format";

export function CategoryDonut({ data }: { data: { name: string; color: string; total: number }[] }) {
  if (!data.length) return <p className="py-16 text-center text-sm text-slate-500">Sem despesas neste mês.</p>;
  const total = data.reduce((a, b) => a + b.total, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => brl(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] text-slate-500">Total</p>
            <p className="text-sm font-bold text-slate-900">{brl(total)}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {data.slice(0, 7).map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {brl(d.total)} <span className="text-xs text-slate-400">({Math.round((d.total / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const rows = data.map((d) => ({ name: monthShort(d.month), Receitas: d.income / 100, Despesas: d.expense / 100 }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip formatter={(v) => brl(Math.round(Number(v) * 100))} cursor={{ fill: "#f1f5f9" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
