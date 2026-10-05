import { route } from "@/lib/api";
import { geminiJSON, getUserGemini } from "@/lib/gemini";
import {
  categoryBreakdown,
  listBudgets,
  listDebts,
  monthlySeries,
  summary,
  upcomingBills,
} from "@/lib/repo";
import { brl, currentMonth, monthRange, shiftMonth, today } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER" },
    verdict: { type: "STRING" },
    summaryText: { type: "STRING" },
    highlights: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    anomalies: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    savingsOpportunities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          potentialSavings: { type: "STRING" },
        },
        required: ["title", "description", "potentialSavings"],
      },
    },
    monthEndForecast: { type: "STRING" },
  },
  required: ["score", "verdict", "summaryText", "highlights", "anomalies", "savingsOpportunities", "monthEndForecast"],
};

export const POST = route(async (user) => {
  const { apiKey, model } = await getUserGemini(user.id);
  const curMonth = currentMonth();
  const prevMonth = shiftMonth(curMonth, -1);

  const curRange = monthRange(curMonth);
  const prevRange = monthRange(prevMonth);

  const [curSum, prevSum, curSpend, budgets, bills, debts, series] = await Promise.all([
    summary(user.id, curRange.from, curRange.to),
    summary(user.id, prevRange.from, prevRange.to),
    categoryBreakdown(user.id, curRange.from, curRange.to, "expense"),
    listBudgets(user.id, curMonth),
    upcomingBills(user.id, 10),
    listDebts(user.id),
    monthlySeries(user.id, curMonth, 3),
  ]);

  const contextData = `
Hoje: ${today()}
Mês Atual (${curMonth}):
- Receitas realizadas: ${brl(curSum.incomePaid)} (previstas no total: ${brl(curSum.income)})
- Despesas pagas: ${brl(curSum.expensePaid)} (a pagar pendentes: ${brl(curSum.expensePending)}, total: ${brl(curSum.expense)})
- Saldo realizado: ${brl(curSum.balanceRealized)}
- Saldo previsto final: ${brl(curSum.balanceForecast)}
- Gastos por Categoria: ${curSpend.map((c) => `${c.name}: ${brl(c.total)}`).join(", ") || "Nenhum lançamento"}
- Tetos de Orçamento: ${budgets.map((b) => `${b.categoryName}: ${brl(b.spentCents)} de ${brl(b.limitCents)} (${Math.round((b.spentCents / b.limitCents) * 100)}%)`).join(", ") || "Nenhum definido"}

Mês Anterior (${prevMonth}):
- Receitas: ${brl(prevSum.income)}
- Despesas: ${brl(prevSum.expense)}
- Saldo final: ${brl(prevSum.balanceRealized)}

Pendências & Compromissos:
- Contas a pagar próximas: ${bills.map((b) => `${b.description}: ${brl(b.amountCents)} vence em ${b.date}`).join("; ") || "Nenhuma"}
- Dívidas ativas: ${debts.map((d) => `${d.name}: saldo devedor ${brl(d.totalCents - d.paidCents)}`).join("; ") || "Nenhuma dívida"}
`;

  const system = `Você é o Auditor Financeiro Sênior e Especialista em IA do app Moneta (inspirado no padrão analítico do Pierre e Minhas Finanças).
Sua missão é realizar um "Raio-X Financeiro" instantâneo, honesto, empático e de alto valor prático para o usuário.
Regras:
1. score: Nota de 0 a 100 da saúde financeira atual (baseado em equilíbrio receita x despesa, pontualidade, orçamentos e reservas).
2. verdict: Escolha exatamente uma palavra/termo: "Excelente", "Estável", "Atenção" ou "Crítico".
3. summaryText: Um diagnóstico geral em 2 ou 3 frases diretas.
4. highlights: 2 a 3 pontos positivos reais identificados nos dados.
5. anomalies: 2 a 4 pontos de atenção, cobranças fora do padrão, orçamentos prestes a estourar ou desvios em relação ao mês anterior.
6. savingsOpportunities: 3 recomendações específicas e realistas de corte de gastos ou economia prática.
7. monthEndForecast: Projeção de como o mês vai fechar se mantiver o ritmo atual.`;

  const out = await geminiJSON<Record<string, unknown>>({
    apiKey,
    model,
    system,
    parts: [{ text: `Analise as finanças deste usuário e gere o Raio-X completo:\n${contextData}` }],
    schema: SCHEMA,
    temperature: 0.2,
  });

  return out;
});
