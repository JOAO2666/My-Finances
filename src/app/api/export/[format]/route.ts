import { route, HttpError } from "@/lib/api";
import { buildReport } from "@/lib/report";
import { buildPdf } from "@/lib/export-pdf";
import { buildXlsx } from "@/lib/export-xlsx";
import { isDate } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ format: string }> };

export const GET = route(async (user, req, ctx: Ctx) => {
  const { format } = await ctx.params;
  if (format !== "pdf" && format !== "xlsx" && format !== "csv") throw new HttpError("Formato inválido.", 404);
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!isDate(from) || !isDate(to) || from > to) throw new HttpError("Período inválido.");

  const report = await buildReport(user.id, user.name, from, to);
  const name = `moneta-relatorio-${from}_a_${to}`;

  if (format === "csv") {
    const lines = [
      ["Data", "Tipo", "Descrição", "Categoria", "Valor (R$)", "Status", "Origem", "Observações"].join(";"),
    ];
    for (const t of report.transactions) {
      const typeLabel = t.type === "income" ? "Receita" : "Despesa";
      const statusLabel = t.status === "paid" ? "Pago/Recebido" : "Pendente";
      const val = (t.amountCents / 100).toFixed(2).replace(".", ",");
      const esc = (s: string | null | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`;
      lines.push([t.date, typeLabel, esc(t.description), esc(t.categoryName || "Sem categoria"), val, statusLabel, t.source, esc(t.notes || "")].join(";"));
    }
    const csvContent = "\uFEFF" + lines.join("\r\n");
    return new Response(new TextEncoder().encode(csvContent), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const body = format === "pdf" ? buildPdf(report) : await buildXlsx(report);
  const type = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
});
