import { geminiJSON } from "./gemini";
import { createDebt, createTransaction, listCategories, listTransactions, matchCategory, type Category, type TxType } from "./repo";
import { isDate, today } from "./format";

export type OcrDoc = {
  kind: "fatura" | "boleto" | "divida" | "comprovante" | "receita" | "outro";
  description: string;
  amount: number;
  dueDate: string | null;
  issuer: string | null;
  type: TxType;
  category: string | null;
  alreadyPaid: boolean;
};

export type OcrResult = {
  kind: OcrDoc["kind"];
  entity: "transaction" | "debt";
  id: string | null;
  description: string;
  issuer: string | null;
  amountCents: number;
  date: string;
  type: TxType;
  status: "paid" | "pending";
  categoryId: string | null;
  categoryName: string | null;
  duplicate: boolean;
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    documents: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: { type: "STRING", enum: ["fatura", "boleto", "divida", "comprovante", "receita", "outro"] },
          description: { type: "STRING" },
          amount: { type: "NUMBER" },
          dueDate: { type: "STRING", nullable: true },
          issuer: { type: "STRING", nullable: true },
          type: { type: "STRING", enum: ["expense", "income"] },
          category: { type: "STRING", nullable: true },
          alreadyPaid: { type: "BOOLEAN" },
        },
        required: ["kind", "description", "amount", "type", "alreadyPaid"],
      },
    },
  },
  required: ["documents"],
};

function systemPrompt(cats: Category[]) {
  const exp = cats.filter((c) => c.type === "expense").map((c) => c.name).join(", ");
  const inc = cats.filter((c) => c.type === "income").map((c) => c.name).join(", ");
  return `Você é um extrator de dados financeiros de imagens (prints de aplicativos de banco, faturas de cartão, boletos, contas de consumo, cobranças e propostas de renegociação de dívidas). Hoje é ${today()}.

Analise a imagem e extraia CADA cobrança/lançamento/dívida distinta visível. Regras:
- "amount": valor total a pagar em reais, número com ponto decimal (ex.: 1234.56). Para fatura de cartão use o valor total da fatura; para boleto o valor do documento; para dívida o saldo devedor total. Nunca invente: se não houver valor legível, ignore o item.
- "dueDate": vencimento no formato AAAA-MM-DD. Se aparecer só dia/mês, use o ano mais plausível em relação a hoje. Se não houver data, use null.
- "description": curta e clara (ex.: "Fatura Nubank", "Boleto Condomínio", "Conta de luz - Enel"). "issuer": empresa/banco/credor, se visível.
- "kind": fatura (cartão), boleto, divida (negativada/atrasada/renegociação/empréstimo/financiamento com saldo devedor), comprovante (pagamento já efetuado), receita (dinheiro a receber/recebido), outro.
- "type": "expense" para contas e dívidas; "income" apenas para receitas/entradas.
- "alreadyPaid": true apenas se a imagem indicar claramente que já foi pago/liquidado (comprovante, "pago", "quitado").
- "category": escolha EXATAMENTE um nome desta lista. Despesas: ${exp}. Receitas: ${inc}.
- Se a imagem não contiver informação financeira, retorne documents vazio.
Responda somente no JSON do schema.`;
}

export async function extractFromImage(opts: {
  apiKey: string;
  model: string;
  mimeType: string;
  data: string;
  categories: Category[];
}): Promise<OcrDoc[]> {
  const out = await geminiJSON<{ documents?: OcrDoc[] }>({
    apiKey: opts.apiKey,
    model: opts.model,
    system: systemPrompt(opts.categories),
    parts: [{ inlineData: { mimeType: opts.mimeType, data: opts.data } }, { text: "Extraia os lançamentos financeiros desta imagem." }],
    schema: SCHEMA,
    temperature: 0,
  });
  return (out.documents ?? []).filter((d) => Number.isFinite(d.amount) && d.amount > 0);
}

/** Converte os documentos extraídos em registros (ou apenas prévia). */
export async function processOcrDocs(userId: string, docs: OcrDoc[], save: boolean): Promise<OcrResult[]> {
  const cats = await listCategories(userId);
  const results: OcrResult[] = [];

  for (const d of docs) {
    const type: TxType = d.kind === "receita" ? "income" : d.type === "income" ? "income" : "expense";
    const isDebt = d.kind === "divida";
    const cat = matchCategory(cats, isDebt ? "Dívidas e financiamentos" : d.category, type);
    const date = isDate(d.dueDate) ? d.dueDate : today();
    const amountCents = Math.round(d.amount * 100);
    const description = (d.description || d.issuer || "Lançamento").slice(0, 200);
    const status: "paid" | "pending" = d.alreadyPaid || d.kind === "comprovante" ? "paid" : "pending";

    // evita duplicar o mesmo lançamento/dívida ao reenviar o mesmo print
    const existing = await listTransactions(userId, { from: date, to: date, q: description, limit: 50 });
    const duplicate = !isDebt && existing.some((t) => t.amountCents === amountCents && t.description === description);

    const base: OcrResult = {
      kind: d.kind,
      entity: isDebt ? "debt" : "transaction",
      id: null,
      description,
      issuer: d.issuer ?? null,
      amountCents,
      date,
      type,
      status,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      duplicate,
    };

    if (save && !duplicate) {
      if (isDebt) {
        base.id = await createDebt(userId, {
          name: description,
          creditor: d.issuer,
          totalCents: amountCents,
          dueDate: isDate(d.dueDate) ? d.dueDate : null,
          source: "ocr",
        });
      } else {
        base.id = await createTransaction(userId, {
          type,
          description,
          amountCents,
          date,
          status,
          categoryId: cat?.id ?? null,
          notes: d.issuer ? `Emissor: ${d.issuer}` : null,
          source: "ocr",
        });
      }
    }
    results.push(base);
  }
  return results;
}
