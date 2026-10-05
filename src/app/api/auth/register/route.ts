import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { createSession, hashPassword, rateLimit } from "@/lib/auth";
import { exec, queryOne, uid } from "@/lib/db";
import { seedCategories } from "@/lib/repo";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(128),
});

export const POST = route(
  async (_u, req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`reg:${ip}`, 20, 5 * 60_000)) throw new HttpError("Muitas tentativas. Aguarde alguns minutos.", 429);

    const { name, email, password } = await json(req, schema);
    if (await queryOne("SELECT id FROM users WHERE email = ?", [email])) {
      throw new HttpError("Este e-mail já está cadastrado.", 409);
    }
    const id = uid();
    await exec("INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)", [id, name, email, await hashPassword(password)]);
    await seedCategories(id);
    await createSession(id);
    return { ok: true };
  },
  { auth: false },
);
