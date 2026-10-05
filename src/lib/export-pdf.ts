import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Report } from "./report";
import { brl, fmtDate } from "./format";

const GREEN: [number, number, number] = [5, 150, 105];
const SLATE: [number, number, number] = [30, 41, 59];

export function buildPdf(r: Report): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Cabeçalho
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(22).text("Moneta", M, 38);
  doc.setFont("helvetica", "normal").setFontSize(11).text("Relatório financeiro", M, 58);
  doc.setFontSize(10).text(`Período: ${fmtDate(r.from)} a ${fmtDate(r.to)}`, W - M, 38, { align: "right" });
  doc.text(`${r.userName}  |  gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - M, 58, { align: "right" });

  // Cartões de resumo
  const s = r.summary;
  const cards: [string, string, [number, number, number]][] = [
    ["Receitas", brl(s.income), [5, 150, 105]],
    ["Despesas", brl(s.expense), [220, 38, 38]],
    ["Saldo realizado", brl(s.balanceRealized), s.balanceRealized >= 0 ? [5, 150, 105] : [220, 38, 38]],
    ["Saldo previsto", brl(s.balanceForecast), s.balanceForecast >= 0 ? [37, 99, 235] : [220, 38, 38]],
  ];
  const gap = 10;
  const cw = (W - 2 * M - gap * 3) / 4;
  cards.forEach(([label, value, color], i) => {
    const x = M + i * (cw + gap);
    doc.setFillColor(241, 245, 249).roundedRect(x, 96, cw, 52, 6, 6, "F");
    doc.setTextColor(100, 116, 139).setFont("helvetica", "normal").setFontSize(9).text(label, x + 10, 114);
    doc.setTextColor(...color).setFont("helvetica", "bold").setFontSize(12).text(value, x + 10, 136);
  });
  doc.setTextColor(100, 116, 139).setFont("helvetica", "normal").setFontSize(8.5);
  doc.text(
    `Recebido ${brl(s.incomePaid)}  |  A receber ${brl(s.incomePending)}  |  Pago ${brl(s.expensePaid)}  |  A pagar ${brl(s.expensePending)}`,
    M,
    164,
  );

  let y = 180;
  const section = (title: string) => {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    doc.setTextColor(...SLATE).setFont("helvetica", "bold").setFontSize(13).text(title, M, y + 12);
    y += 20;
  };
  const after = () => {
    // @ts-expect-error lastAutoTable é injetado pelo plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 22;
  };
  const common = {
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: SLATE, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  };

  // Despesas por categoria
  if (r.expenseByCategory.length) {
    section("Despesas por categoria");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Categoria", "Total", "% das despesas"]],
      body: r.expenseByCategory.map((c) => [c.name, brl(c.total), s.expense ? `${((c.total / s.expense) * 100).toFixed(1)}%` : "-"]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    after();
  }

  if (r.incomeByCategory.length) {
    section("Receitas por categoria");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Categoria", "Total", "% das receitas"]],
      body: r.incomeByCategory.map((c) => [c.name, brl(c.total), s.income ? `${((c.total / s.income) * 100).toFixed(1)}%` : "-"]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    after();
  }

  if (r.budgets.length) {
    section(`Orçamentos (${r.budgetMonth.split("-").reverse().join("/")})`);
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Categoria", "Limite", "Gasto", "Restante", "% usado"]],
      body: r.budgets.map((b) => [
        b.categoryName,
        brl(b.limitCents),
        brl(b.spentCents),
        brl(b.limitCents - b.spentCents),
        `${Math.round((b.spentCents / b.limitCents) * 100)}%`,
      ]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 4) {
          const pct = parseInt(String(d.cell.raw), 10);
          if (pct >= 100) d.cell.styles.textColor = [220, 38, 38];
          else if (pct >= 80) d.cell.styles.textColor = [217, 119, 6];
        }
      },
    });
    after();
  }

  const openDebts = r.debts.filter((d) => d.paidCents < d.totalCents);
  if (openDebts.length) {
    section("Dívidas em aberto");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Dívida", "Credor", "Total", "Pago", "Saldo", "Vencimento"]],
      body: openDebts.map((d) => [
        d.name,
        d.creditor ?? "-",
        brl(d.totalCents),
        brl(d.paidCents),
        brl(d.totalCents - d.paidCents),
        d.dueDate ? fmtDate(d.dueDate) : "-",
      ]),
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    after();
  }

  section(`Lançamentos (${r.transactions.length})`);
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Data", "Descrição", "Categoria", "Situação", "Valor"]],
    body: r.transactions.map((t) => [
      fmtDate(t.date),
      t.description,
      t.categoryName ?? "Sem categoria",
      t.status === "paid" ? "Pago" : "Pendente",
      (t.type === "income" ? "+ " : "- ") + brl(t.amountCents),
    ]),
    columnStyles: { 0: { cellWidth: 58 }, 3: { cellWidth: 56 }, 4: { halign: "right", cellWidth: 82 } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 4) {
        d.cell.styles.textColor = String(d.cell.raw).startsWith("+") ? [5, 150, 105] : [220, 38, 38];
      }
    },
  });

  // Rodapé com paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184).setFont("helvetica", "normal").setFontSize(8);
    doc.text(`Moneta - página ${i} de ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
