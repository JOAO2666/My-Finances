import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/format";

export function MonthNav({ month, base }: { month: string; base: string }) {
  const cur = currentMonth();
  return (
    <div className="flex items-center gap-1">
      <Link href={`${base}?m=${shiftMonth(month, -1)}`} prefetch={false} className="btn-secondary btn-sm" aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </Link>
      <span className="min-w-36 text-center text-sm font-semibold capitalize text-slate-800">{monthLabel(month)}</span>
      <Link href={`${base}?m=${shiftMonth(month, 1)}`} prefetch={false} className="btn-secondary btn-sm" aria-label="Próximo mês">
        <ChevronRight size={16} />
      </Link>
      {month !== cur && (
        <Link href={base} prefetch={false} className="btn-ghost btn-sm">
          Hoje
        </Link>
      )}
    </div>
  );
}
