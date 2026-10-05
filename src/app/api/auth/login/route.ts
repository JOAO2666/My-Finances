import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { createSession, hashPassword, rateLimit, verifyPassword } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const POST = route(
  async (_u, req) => {
    const { email, password } = await json(req, schema);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`login:${ip}:${email}`, 20, 5 * 60_000)) throw new HttpError("Muitas tentativas. Aguarde alguns minutos.", 429);

    const u = await queryOne<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", [email]);
    // iguala o tempo de resposta quando o e-mail não existe
    const ok = u ? await verifyPassword(password, u.password_hash) : (await hashPassword(password), false);
    if (!u || !ok) throw new HttpError("E-mail ou senha incorretos.", 401);
    await createSession(u.id);
    return { ok: true };
  },
  { auth: false },
);
