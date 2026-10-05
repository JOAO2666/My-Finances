import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Criptografia AES-256-GCM para guardar a chave Gemini do usuário em repouso. */

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_SECRET não configurado (mínimo 16 caracteres).");
    }
    return "dev-only-insecure-secret-change-me";
  }
  return s;
}

const key = () => createHash("sha256").update("moneta:enc:" + appSecret()).digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string | null {
  try {
    const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
