import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getUser, type SessionUser } from "./auth";
import { GeminiError } from "./gemini";
import { isDate } from "./format";
import { queryOne } from "./db";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Envolve um route handler: autentica, valida e padroniza erros em JSON. */
export function route<A extends unknown[]>(
  fn: (user: SessionUser, req: Request, ...rest: A) => Promise<Response | object>,
  opts: { auth?: boolean } = {},
) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    try {
      let user = null as SessionUser | null;
      if (opts.auth !== false) {
        user = await getUser();
        if (!user) throw new HttpError("Não autenticado.", 401);
      }
      const out = await fn(user as SessionUser, req, ...rest);
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => i.message).join("; ");
        return NextResponse.json({ error: msg || "Dados inválidos." }, { status: 400 });
      }
      if (e instanceof HttpError || e instanceof GeminiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error("[api]", e);
      return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
  };
}

export async function json<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

export const zDate = z.string().refine(isDate, "Data inválida (use AAAA-MM-DD).");
export const zCents = z.number().int("Valor inválido.").min(0, "Valor inválido.").max(100_000_000_000, "Valor muito alto.");

export const txInput = z.object({
  type: z.enum(["expense", "income"]),
  description: z.string().trim().min(1, "Informe a descrição.").max(200),
  amountCents: zCents,
  date: zDate,
  status: z.enum(["paid", "pending"]),
  categoryId: z.string().nullable().optional().transform((v) => v ?? null),
  notes: z.string().max(1000).nullable().optional(),
});

export const debtInput = z.object({
  name: z.string().trim().min(1, "Informe o nome da dívida.").max(120),
  creditor: z.string().trim().max(120).nullable().optional(),
  totalCents: zCents,
  paidCents: zCents.optional(),
  dueDate: zDate.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

/** Garante que a categoria pertence ao usuário (evita referenciar categoria de outro). */
export async function assertOwnCategory(userId: string, categoryId: string | null | undefined, type?: "expense" | "income") {
  if (!categoryId) return;
  const c = await queryOne<{ type: string }>("SELECT type FROM categories WHERE id = ? AND user_id = ?", [categoryId, userId]);
  if (!c) throw new HttpError("Categoria inválida.");
  if (type && c.type !== type) throw new HttpError("A categoria não corresponde ao tipo do lançamento.");
}
