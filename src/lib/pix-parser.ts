// Parser for Brazilian Bank Pix Notifications and Receipts
import { parseMoney, today } from "./format";

export type ParsedPixNotification = {
  bankName: string;
  type: "expense" | "income";
  amountCents: number;
  recipient: string;
  description: string;
  date: string;
  rawText: string;
};

export function parsePixNotification(text: string): ParsedPixNotification | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();
  if (clean.length < 8) return null;

  // Detect bank
  let bankName = "Banco";
  const lower = clean.toLowerCase();
  if (lower.includes("nubank") || lower.includes("nu pagamentos")) bankName = "Nubank";
  else if (lower.includes("inter") || lower.includes("banco inter")) bankName = "Banco Inter";
  else if (lower.includes("itau") || lower.includes("itaú")) bankName = "Itaú";
  else if (lower.includes("bradesco")) bankName = "Bradesco";
  else if (lower.includes("santander")) bankName = "Santander";
  else if (lower.includes("c6") || lower.includes("c6 bank")) bankName = "C6 Bank";
  else if (lower.includes("picpay")) bankName = "PicPay";
  else if (lower.includes("mercado pago") || lower.includes("mercadopago")) bankName = "Mercado Pago";
  else if (lower.includes("caixa")) bankName = "Caixa";
  else if (lower.includes("banco do brasil") || lower.includes("bb")) bankName = "Banco do Brasil";

  // Check if it looks like a Pix or transfer message
  const hasPixKeyword =
    lower.includes("pix") ||
    lower.includes("transfer") ||
    lower.includes("pagou") ||
    lower.includes("pagamento") ||
    lower.includes("compra") ||
    lower.includes("débito") ||
    lower.includes("debito") ||
    lower.includes("r$");

  if (!hasPixKeyword) return null;

  // Determine type: income or expense
  const isIncome =
    lower.includes("recebeu") ||
    lower.includes("recebido") ||
    lower.includes("creditado") ||
    lower.includes("depósito") ||
    lower.includes("deposito");

  const type: "expense" | "income" = isIncome ? "income" : "expense";

  // Extract monetary value: e.g. R$ 1.250,50 or R$45,90 or 45,90
  const moneyMatch = clean.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
    clean.match(/R\$\s*([0-9]+,[0-9]{2})/i) ||
    clean.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/);

  if (!moneyMatch) return null;

  const rawAmountStr = moneyMatch[1];
  const amountCents = parseMoney(rawAmountStr);
  if (amountCents <= 0) return null;

  // Extract recipient / destination
  let recipient = "";
  const recipientMatch =
    clean.match(/para\s+([^.,;\n]+?)(?:\s+pelo\s+pix|\s+no\s+valor|\.|\n|$)/i) ||
    clean.match(/favorecido:?\s*([^.,;\n]+)/i) ||
    clean.match(/destinat[aá]rio:?\s*([^.,;\n]+)/i) ||
    clean.match(/de\s+([^.,;\n]+?)(?:\s+pelo\s+pix|\s+no\s+valor|\.|\n|$)/i);

  if (recipientMatch && recipientMatch[1]) {
    recipient = recipientMatch[1].trim();
    // Clean up trailing noise
    recipient = recipient.replace(/(via pix|pelo pix|com sucesso|no valor de|no valor).*$/i, "").trim();
  }

  if (!recipient) {
    recipient = isIncome ? "Recebimento Pix" : "Pagamento Pix";
  }

  const description = isIncome
    ? `Pix recebido - ${recipient}`
    : `Pix para ${recipient}`;

  return {
    bankName,
    type,
    amountCents,
    recipient,
    description,
    date: today(),
    rawText: clean,
  };
}
