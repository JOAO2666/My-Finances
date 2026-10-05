import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { decrypt, encrypt } from "@/lib/crypto";
import { exec, queryOne } from "@/lib/db";
import { testGeminiKey } from "@/lib/gemini";

export const runtime = "nodejs";

const model = z.string().trim().regex(/^[a-zA-Z0-9._-]{3,60}$/, "Nome de modelo inválido.");

/** Salva (e valida) a chave Gemini do usuário e o modelo preferido. */
export const PUT = route(async (user, req) => {
  const d = await json(
    req,
    z.object({
      apiKey: z.string().trim().min(20, "Chave inválida.").max(200).optional(),
      model: model.optional(),
      validate: z.boolean().optional(),
    }),
  );
  const current = await queryOne<{ gemini_key_enc: string | null; gemini_model: string }>(
    "SELECT gemini_key_enc, gemini_model FROM users WHERE id = ?",
    [user.id],
  );
  const finalModel = d.model ?? current?.gemini_model ?? "gemini-2.5-flash";
  const finalKey = d.apiKey ?? (current?.gemini_key_enc ? decrypt(current.gemini_key_enc) : null);

  if (d.validate !== false && finalKey) await testGeminiKey(finalKey, finalModel);

  if (d.apiKey) {
    await exec("UPDATE users SET gemini_key_enc = ?, gemini_model = ? WHERE id = ?", [encrypt(d.apiKey), finalModel, user.id]);
  } else {
    if (!current?.gemini_key_enc && d.validate !== false) throw new HttpError("Informe a chave de API.");
    await exec("UPDATE users SET gemini_model = ? WHERE id = ?", [finalModel, user.id]);
  }
  return { ok: true };
});

export const DELETE = route(async (user) => {
  await exec("UPDATE users SET gemini_key_enc = NULL WHERE id = ?", [user.id]);
  return { ok: true };
});
