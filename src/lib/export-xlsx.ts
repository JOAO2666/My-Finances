import ExcelJS from "exceljs";
import type { Report } from "./report";
import { fmtDate } from "./format";

const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const GREEN = "FF059669";

function header(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildXlsx(r: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Moneta";
  wb.created = new Date();

  // Resumo
  const rs = wb.addWorksheet("Resumo");
  rs.columns = [
    { header: "Indicador", key: "k", width: 34 },
    { header: "Valor", key: "v", width: 20 },
  ];
  const s = r.summary;
  const items: [string, number][] = [
    ["Receitas recebidas", s.incomePaid / 100],
    ["Receitas a receber", s.incomePending / 100],
    ["Total de receitas", s.income / 100],
    ["Despesas pagas", s.expensePaid / 100],
    ["Despesas a pagar", s.expensePending / 100],
    ["Total de despesas", s.expense / 100],
    ["Saldo realizado", s.balanceRealized / 100],
    ["Saldo previsto", s.balanceForecast / 100],
  ];
  items.forEach(([k, v]) => rs.addRow({ k, v }).getCell(2).numFmt = BRL);
  header(rs);
  rs.addRow([]);
  rs.addRow([`Período: ${fmtDate(r.from)} a ${fmtDate(r.to)}`]);
  rs.addRow([`Usuário: ${r.userName}`]);

  // Lançamentos
  const wt = wb.addWorksheet("Lançamentos");
  wt.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Descrição", key: "desc", width: 42 },
    { header: "Categoria", key: "cat", width: 26 },
    { header: "Tipo", key: "type", width: 10 },
    { header: "Situação", key: "status", width: 12 },
    { header: "Valor", key: "amount", width: 16 },
    { header: "Origem", key: "src", width: 12 },
  ];
  for (const t of r.transactions) {
    const row = wt.addRow({
      date: new Date(t.date + "T12:00:00"),
      desc: t.description,
      cat: t.categoryName ?? "Sem categoria",
      type: t.type === "income" ? "Receita" : "Despesa",
      status: t.status === "paid" ? "Pago" : "Pendente",
      amount: (t.type === "income" ? 1 : -1) * (t.amountCents / 100),
      src: t.source === "ocr" ? "Leitura IA" : t.source === "assistant" ? "Assistente" : "Manual",
    });
    row.getCell("date").numFmt = "dd/mm/yyyy";
    row.getCell("amount").numFmt = BRL;
  }
  header(wt);
  wt.autoFilter = { from: "A1", to: "G1" };

  // Por categoria
  const wc = wb.addWorksheet("Por categoria");
  wc.columns = [
    { header: "Tipo", key: "t", width: 10 },
    { header: "Categoria", key: "c", width: 32 },
    { header: "Total", key: "v", width: 18 },
    { header: "% do tipo", key: "p", width: 12 },
  ];
  const addCats = (label: string, list: Report["expenseByCategory"], total: number) =>
    list.forEach((c) => {
      const row = wc.addRow({ t: label, c: c.name, v: c.total / 100, p: total ? c.total / total : 0 });
      row.getCell("v").numFmt = BRL;
      row.getCell("p").numFmt = "0.0%";
    });
  addCats("Despesa", r.expenseByCategory, s.expense);
  addCats("Receita", r.incomeByCategory, s.income);
  header(wc);

  // Orçamentos
  const wb2 = wb.addWorksheet("Orçamentos");
  wb2.columns = [
    { header: "Categoria", key: "c", width: 30 },
    { header: "Limite mensal", key: "l", width: 18 },
    { header: `Gasto em ${r.budgetMonth}`, key: "s", width: 18 },
    { header: "Restante", key: "r", width: 18 },
    { header: "% usado", key: "p", width: 12 },
  ];
  for (const b of r.budgets) {
    const row = wb2.addRow({
      c: b.categoryName,
      l: b.limitCents / 100,
      s: b.spentCents / 100,
      r: (b.limitCents - b.spentCents) / 100,
      p: b.spentCents / b.limitCents,
    });
    ["l", "s", "r"].forEach((k) => (row.getCell(k).numFmt = BRL));
    row.getCell("p").numFmt = "0%";
  }
  header(wb2);

  // Dívidas
  const wd = wb.addWorksheet("Dívidas");
  wd.columns = [
    { header: "Dívida", key: "n", width: 32 },
    { header: "Credor", key: "c", width: 24 },
    { header: "Total", key: "t", width: 16 },
    { header: "Pago", key: "p", width: 16 },
    { header: "Saldo devedor", key: "s", width: 18 },
    { header: "Vencimento", key: "d", width: 14 },
  ];
  for (const d of r.debts) {
    const row = wd.addRow({
      n: d.name,
      c: d.creditor ?? "",
      t: d.totalCents / 100,
      p: d.paidCents / 100,
      s: Math.max(0, d.totalCents - d.paidCents) / 100,
      d: d.dueDate ? fmtDate(d.dueDate) : "",
    });
    ["t", "p", "s"].forEach((k) => (row.getCell(k).numFmt = BRL));
  }
  header(wd);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
