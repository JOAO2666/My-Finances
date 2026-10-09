import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { appSecret } from "./crypto";
import { queryOne } from "./db";

const COOKIE = "moneta_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

const secretKey = () => new TextEncoder().encode(appSecret());

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  geminiModel: string;
  hasGeminiKey: boolean;
};

export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const u = await queryOne<{
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
      gemini_model: string;
      gemini_key_enc: string | null;
    }>("SELECT id, name, email, avatar_url, gemini_model, gemini_key_enc FROM users WHERE id = ?", [payload.sub]);
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatar_url,
      geminiModel: u.gemini_model,
      hasGeminiKey: !!u.gemini_key_enc,
    };
  } catch {
    return null;
  }
}

/** Para Server Components/páginas: redireciona ao login se não autenticado. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** Rate limit simples em memória (best-effort por instância serverless). */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}
