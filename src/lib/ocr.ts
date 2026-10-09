import { geminiJSON } from "./gemini";
import {
  createDebt,
  createTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  matchCategory,
  type Account,
  type Category,
  type TxType,
} from "./repo";
import { isDate, today } from "./format";

export type OcrDoc = {
  kind: "fatura" | "boleto" | "divida" | "comprovante" | "receita" | "investimento" | "outro";
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
  accountId?: string | null;
  accountName?: string | null;
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
          kind: { type: "STRING", enum: ["fatura", "boleto", "divida", "comprovante", "receita", "investimento", "outro"] },
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
  return `Você é um extrator especialista de dados financeiros de imagens (prints de aplicativos bancários como Nubank/Inter/Itaú/Bradesco/Santander, faturas de cartão, boletos, comprovantes Pix/TED, notas fiscais, extratos de corretoras/investimentos e renegociação de dívidas). Hoje é ${today()}.

Analise a imagem e extraia CADA cobrança, lançamento, aporte de investimento, rendimento ou dívida distinta visível. Regras:
- "amount": valor total em reais, número com ponto decimal (ex.: 1234.56). Para fatura use o total da fatura; para boleto o valor do documento; para comprovante o valor transferido/pago; para investimento o valor aportado ou rendimento recebido; para dívida o saldo devedor. Nunca invente: se não houver valor legível, ignore o item.
- "dueDate": vencimento ou data da operação no formato AAAA-MM-DD. Se aparecer só dia/mês, use o ano mais plausível em relação a hoje. Se não houver data, use null.
- "description": curta e clara (ex.: "Fatura Nubank", "Boleto Condomínio", "Comprovante Pix Supermercado", "Aporte CDB Inter", "Dividendos FIIs", "Conta de luz - Enel").
- "issuer": banco, corretora, instituição ou credor (ex.: "Nubank", "Banco Inter", "XP", "Itaú", "Bradesco", "Santander", "BTG", "Enel", etc.), se visível.
- "kind": 
  - fatura (fatura de cartão de crédito)
  - boleto (boleto de cobrança)
  - divida (dívida atrasada, renegociação, empréstimo com saldo devedor)
  - comprovante (comprovante Pix, débito ou pagamento efetuado)
  - receita (salário, freelance, Pix recebido)
  - investimento (aporte em CDB/LCI/Tesouro/Ações, compra de ativos ou rendimentos/dividendos)
  - outro
- "type": "expense" para contas, faturas, boletos e aportes/compras de investimentos; "income" para receitas e rendimentos/dividendos.
- "alreadyPaid": true apenas se a imagem indicar que já foi liquidado/pago (comprovante Pix, "pago", "quitado", "aplicação realizada").
- "category": escolha EXATAMENTE um nome desta lista. Despesas: ${exp}. Receitas: ${inc}. Se for investimento, use a categoria de Investimentos.
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
  const [cats, accounts] = await Promise.all([listCategories(userId), listAccounts(userId)]);
  const results: OcrResult[] = [];

  for (const d of docs) {
    const isDebt = d.kind === "divida";
    const isInvestment = d.kind === "investimento";
    const type: TxType = d.kind === "receita" ? "income" : d.type === "income" ? "income" : "expense";

    // Encontra a melhor categoria
    let targetCat = d.category;
    if (isDebt) {
      targetCat = "Dívidas e financiamentos";
    } else if (isInvestment && (!targetCat || targetCat === "Outros")) {
      targetCat = "Investimentos";
    }
    const cat = matchCategory(cats, targetCat, type);

    const date = isDate(d.dueDate) ? d.dueDate : today();
    const amountCents = Math.round(d.amount * 100);
    const description = (d.description || d.issuer || "Lançamento").slice(0, 200);
    const status: "paid" | "pending" = d.alreadyPaid || d.kind === "comprovante" ? "paid" : "pending";

    // Cruzamento com contas bancárias cadastradas
    let matchedAccount: Account | null = null;
    if (d.issuer) {
      const issuerLow = d.issuer.toLowerCase();
      matchedAccount =
        accounts.find(
          (a) =>
            a.name.toLowerCase().includes(issuerLow) ||
            (a.institution && a.institution.toLowerCase().includes(issuerLow)) ||
            issuerLow.includes(a.name.toLowerCase()),
        ) ?? null;
    }
    if (!matchedAccount && isInvestment) {
      matchedAccount = accounts.find((a) => a.type === "investment") ?? null;
    }

    // Cruzamento com lançamentos existentes no site para evitar duplicidades
    const existing = await listTransactions(userId, { from: date, to: date, q: description, limit: 50 });
    const duplicate =
      !isDebt &&
      existing.some(
        (t) =>
          t.amountCents === amountCents &&
          (t.description === description || t.description.toLowerCase().includes(description.toLowerCase())),
      );

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
      accountId: matchedAccount?.id ?? null,
      accountName: matchedAccount?.name ?? null,
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
          accountId: matchedAccount?.id ?? null,
          notes: d.issuer ? `Emissor/Banco: ${d.issuer}` : null,
          source: "ocr",
        });
      }
    }
    results.push(base);
  }
  return results;
}
