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
  if (format !== "pdf" && format !== "xlsx") throw new HttpError("Formato inválido.", 404);
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!isDate(from) || !isDate(to) || from > to) throw new HttpError("Período inválido.");

  const report = await buildReport(user.id, user.name, from, to);
  const name = `moneta-relatorio-${from}_a_${to}`;
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
