import { decrypt } from "./crypto";
import { queryOne } from "./db";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Recupera a chave Gemini do usuário (BYOK). Nunca é enviada ao navegador. */
export async function getUserGemini(userId: string): Promise<{ apiKey: string; model: string }> {
  const row = await queryOne<{ gemini_key_enc: string | null; gemini_model: string }>(
    "SELECT gemini_key_enc, gemini_model FROM users WHERE id = ?",
    [userId],
  );
  const apiKey = row?.gemini_key_enc ? decrypt(row.gemini_key_enc) : null;
  if (!apiKey) {
    throw new GeminiError("Configure sua chave de API do Google (Gemini) em Configurações para usar a IA.", 400);
  }
  return { apiKey, model: row!.gemini_model || "gemini-2.5-flash" };
}

function friendly(status: number, body: string): GeminiError {
  let detail = "";
  try {
    detail = JSON.parse(body)?.error?.message ?? "";
  } catch {
    /* ignore */
  }
  if (status === 400 && /API key/i.test(detail)) return new GeminiError("Chave de API do Google inválida. Verifique em Configurações.", 400);
  if (status === 401 || status === 403) return new GeminiError("A chave do Google foi recusada (sem permissão). Verifique-a em Configurações.", 400);
  if (status === 404) return new GeminiError(`Modelo não encontrado. Ajuste o modelo em Configurações. ${detail}`, 400);
  if (status === 429) return new GeminiError("Limite de uso da API do Google atingido. Tente novamente em instantes.", 429);
  return new GeminiError(`Erro da API do Google (${status}). ${detail}`.trim(), 502);
}

/** Chama o Gemini pedindo JSON estruturado e devolve o objeto já parseado. */
export async function geminiJSON<T>(opts: {
  apiKey: string;
  model: string;
  system?: string;
  parts: GeminiPart[];
  schema: unknown;
  temperature?: number;
}): Promise<T> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.1,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${ENDPOINT}/models/${encodeURIComponent(opts.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
  }).catch((e) => {
    throw new GeminiError(`Falha ao contatar a API do Google: ${e instanceof Error ? e.message : e}`, 502);
  });

  const raw = await res.text();
  if (!res.ok) throw friendly(res.status, raw);

  let data: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new GeminiError("Resposta inválida da API do Google.", 502);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) {
    throw new GeminiError(
      data.promptFeedback?.blockReason ? "A IA recusou analisar este conteúdo." : "A IA não retornou resultado.",
      502,
    );
  }
  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as T;
  } catch {
    throw new GeminiError("A IA retornou um formato inesperado. Tente novamente.", 502);
  }
}

/** Valida a chave com uma chamada mínima. */
export async function testGeminiKey(apiKey: string, model: string): Promise<void> {
  const res = await fetch(`${ENDPOINT}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch((e) => {
    throw new GeminiError(`Falha ao contatar a API do Google: ${e instanceof Error ? e.message : e}`, 502);
  });
  if (!res.ok) throw friendly(res.status, await res.text());
}
