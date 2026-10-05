import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { geminiJSON, getUserGemini } from "@/lib/gemini";
import {
  categoryBreakdown,
  createTransaction,
  listBudgets,
  listCategories,
  listDebts,
  listTransactions,
  matchCategory,
  summary,
  upcomingBills,
  type TxType,
} from "@/lib/repo";
import { brl, currentMonth, isDate, monthLabel, monthRange, today } from "@/lib/format";
import { rateLimit } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
});

const SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    transactions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          amount: { type: "NUMBER" },
          date: { type: "STRING", nullable: true },
          type: { type: "STRING", enum: ["expense", "income"] },
          category: { type: "STRING", nullable: true },
          paid: { type: "BOOLEAN" },
        },
        required: ["description", "amount", "type", "paid"],
      },
    },
  },
  required: ["reply", "transactions"],
};

export const POST = route(async (user, req) => {
  if (!rateLimit(`chat:${user.id}`, 30, 60_000)) throw new HttpError("Muitas mensagens seguidas. Aguarde um minuto.", 429);
  const { messages } = await json(req, schema);
  if (messages[messages.length - 1].role !== "user") throw new HttpError("Mensagem inválida.");

  const { apiKey, model } = await getUserGemini(user.id);
  const month = currentMonth();
  const { from, to } = monthRange(month);
  const [cats, sum, spend, budgets, bills, debts, recent] = await Promise.all([
    listCategories(user.id),
    summary(user.id, from, to),
    categoryBreakdown(user.id, from, to, "expense"),
    listBudgets(user.id, month),
    upcomingBills(user.id, 10),
    listDebts(user.id),
    listTransactions(user.id, { limit: 25 }),
  ]);

  const context = [
    `Hoje: ${today()}. Mês atual: ${monthLabel(month)}.`,
    `Resumo do mês: receitas ${brl(sum.income)} (recebidas ${brl(sum.incomePaid)}), despesas ${brl(sum.expense)} (pagas ${brl(sum.expensePaid)}, a pagar ${brl(sum.expensePending)}), saldo realizado ${brl(sum.balanceRealized)}, saldo previsto ${brl(sum.balanceForecast)}.`,
    `Gastos por categoria no mês: ${spend.map((s) => `${s.name} ${brl(s.total)}`).join("; ") || "nenhum"}.`,
    `Orçamentos: ${budgets.map((b) => `${b.categoryName} ${brl(b.spentCents)} de ${brl(b.limitCents)}`).join("; ") || "nenhum definido"}.`,
    `Contas a pagar: ${bills.map((b) => `${b.description} ${brl(b.amountCents)} vence ${b.date}`).join("; ") || "nenhuma"}.`,
    `Dívidas: ${debts.map((d) => `${d.name} saldo ${brl(d.totalCents - d.paidCents)}${d.dueDate ? ` venc. ${d.dueDate}` : ""}`).join("; ") || "nenhuma"}.`,
    `Últimos lançamentos: ${recent.map((t) => `${t.date} ${t.type === "income" ? "+" : "-"}${brl(t.amountCents)} ${t.description} [${t.categoryName ?? "sem categoria"}, ${t.status === "paid" ? "pago" : "pendente"}]`).join(" | ") || "nenhum"}.`,
    `Categorias de despesa: ${cats.filter((c) => c.type === "expense").map((c) => c.name).join(", ")}. Categorias de receita: ${cats.filter((c) => c.type === "income").map((c) => c.name).join(", ")}.`,
  ].join("\n");

  const system = `Você é o assistente financeiro do app Moneta, no estilo de uma conversa leve, direta e empática (em português do Brasil). Ajude o usuário a entender e organizar o dinheiro dele.
Regras:
- Responda com base nos DADOS abaixo; nunca invente números. Se faltar dado, diga isso.
- Seja conciso (até ~6 linhas), use valores em R$ e, quando útil, dê 1 dica prática.
- Se o usuário RELATAR um gasto ou ganho (ex.: "gastei 45 no mercado", "recebi 3000 de salário", "paguei 120 de luz ontem"), registre-o em "transactions" e confirme na resposta. Use a data informada (formato AAAA-MM-DD; "hoje"/"ontem" relativos a ${today()}) ou null para hoje. "paid" é true se já aconteceu/pagou, false se for conta futura.
- Se for apenas pergunta/conversa, retorne "transactions" vazio.
- Escolha "category" exatamente entre as categorias listadas.
- Não dê recomendações de investimento específicas; seja educativo.

DADOS DO USUÁRIO:
${context}`;

  const contents = messages.map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");
  const out = await geminiJSON<{
    reply: string;
    transactions?: { description: string; amount: number; date?: string | null; type: TxType; category?: string | null; paid: boolean }[];
  }>({
    apiKey,
    model,
    system,
    parts: [{ text: `Conversa até agora:\n${contents}\n\nResponda à última mensagem do usuário.` }],
    schema: SCHEMA,
    temperature: 0.3,
  });

  const created: { id: string; description: string; amountCents: number; type: TxType; date: string; categoryName: string | null }[] = [];
  for (const t of out.transactions ?? []) {
    if (!Number.isFinite(t.amount) || t.amount <= 0) continue;
    const type: TxType = t.type === "income" ? "income" : "expense";
    const cat = matchCategory(cats, t.category, type);
    const date = isDate(t.date) ? t.date : today();
    const amountCents = Math.round(t.amount * 100);
    const description = t.description.slice(0, 200);
    const id = await createTransaction(user.id, {
      type,
      description,
      amountCents,
      date,
      status: t.paid ? "paid" : "pending",
      categoryId: cat?.id ?? null,
      source: "assistant",
    });
    created.push({ id, description, amountCents, type, date, categoryName: cat?.name ?? null });
  }
  return { reply: out.reply ?? "Entendido!", created };
});
