import { brl } from "@/lib/format";

export function BudgetBar({ name, color, spent, limit }: { name: string; color: string; spent: number; limit: number }) {
  const pct = limit ? (spent / limit) * 100 : 0;
  const state = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
  const bar = state === "over" ? "bg-red-500" : state === "warn" ? "bg-amber-500" : "bg-brand-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-800">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {name}
        </span>
        <span className="tabular-nums text-slate-600">
          {brl(spent)} <span className="text-slate-400">/ {brl(limit)}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className={`mt-0.5 text-xs ${state === "over" ? "font-medium text-red-600" : state === "warn" ? "text-amber-700" : "text-slate-400"}`}>
        {state === "over" ? `Estourou em ${brl(spent - limit)}` : `Restam ${brl(limit - spent)} (${Math.round(pct)}% usado)`}
      </p>
    </div>
  );
}
