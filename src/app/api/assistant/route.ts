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
  agent: z.enum(["sentinel", "behavior", "strategist", "simulator"]).optional().default("sentinel"),
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
  const { messages, agent } = await json(req, schema);
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

  const agentPersonas = {
    sentinel: `Você é o AGENTE ALBERT (Sentinela do Dia a Dia) do app My Finances (inspirado na inteligência Pierre).
Seu foco principal é:
- Vigiar as movimentações do dia a dia e detectar cobranças atípicas ou fora do padrão.
- Identificar cobranças duplicadas, assinaturas esquecidas e anomalias de valor.
- Alertar sobre contas próximas do vencimento e prazos críticos para evitar juros.
- Manter o usuário seguro contra desperdícios operacionais diários.`,

    behavior: `Você é a AGENTE MARIE (Comportamento & Hábitos) do app My Finances (inspirada na inteligência Pierre).
Seu foco principal é:
- Analisar quinzenalmente os hábitos de consumo e identificar onde o dinheiro está vazando sem o usuário perceber.
- Mapear categorias que cresceram desproporcionalmente em relação ao período anterior.
- Trazer reflexões e dicas comportamentais práticas para conter compras por impulso.`,

    strategist: `Você é o AGENTE GALILEU (Estrategista & Visão Mensal) do app My Finances (inspirado na inteligência Pierre).
Seu foco principal é:
- Entregar a visão mensal consolidada com projeção de fechamento do mês e saldo livre futuro.
- Rebalancear limites de orçamento por categoria e acelerar as metas de economia (cofres).
- Sugerir alocação inteligente da renda (ex.: regra 50-30-20 ou reservas) baseada nos dados reais.`,

    simulator: `Você é o AGENTE PIERRE COMPUTER (Simulador Autônomo de Cenários) do app My Finances.
Seu foco principal é:
- Realizar simulações financeiras profundas e cálculos matemáticos precisos sob medida.
- Simular quitação antecipada de dívidas vs manter em reservas, impactos de cortes específicos e compras parceladas.
- Comparar opções e projetar o tempo exato para alcançar objetivos financeiros.`,
  };

  const selectedPersona = agentPersonas[agent] || agentPersonas.sentinel;

  const system = `${selectedPersona}
Regras universais:
- Responda com base nos DADOS abaixo; nunca invente números. Se faltar dado, diga isso com clareza.
- Seja direto, empático e prático (até ~7 linhas em português do Brasil).
- Se o usuário RELATAR um gasto ou ganho (ex.: "gastei 45 no mercado", "recebi 3000 de salário", "paguei 120 de luz ontem", "comprei uma mesa parcelada em 4x de 100"), registre-o em "transactions" e confirme na resposta. Use a data informada (formato AAAA-MM-DD; "hoje"/"ontem" relativos a ${today()}) ou null para hoje. "paid" é true se já aconteceu/pagou, false se for conta futura.
- Se for apenas pergunta, conversa ou simulação, retorne "transactions" como array vazio [].
- Escolha "category" exatamente entre as categorias listadas.
- Não faça consultoria regulada de valores mobiliários; seja educativo e focado em controle orçamentário.

DADOS REAIS DO USUÁRIO:
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
