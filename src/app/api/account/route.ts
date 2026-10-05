import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { exec, queryOne } from "@/lib/db";
import { deleteAccount } from "@/lib/repo";

export const runtime = "nodejs";

/** Altera a senha. */
export const PATCH = route(async (user, req) => {
  const d = await json(
    req,
    z.object({
      currentPassword: z.string().min(1, "Informe a senha atual."),
      newPassword: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres.").max(128),
    }),
  );
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(d.currentPassword, row.password_hash))) throw new HttpError("Senha atual incorreta.", 403);
  await exec("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(d.newPassword), user.id]);
  return { ok: true };
});

/** Exclui a conta e todos os dados. */
export const DELETE = route(async (user, req) => {
  const d = await json(req, z.object({ password: z.string().min(1, "Informe a senha.") }));
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(d.password, row.password_hash))) throw new HttpError("Senha incorreta.", 403);
  await deleteAccount(user.id);
  await destroySession();
  return { ok: true };
});
