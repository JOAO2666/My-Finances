import { mkdirSync } from "node:fs";
import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * Camada de banco de dados (libSQL / Turso).
 * - Produção (Vercel): defina TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * - Desenvolvimento: sem variáveis, usa o arquivo local ./data/moneta.db.
 * O schema é criado automaticamente (idempotente) no primeiro acesso.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    gemini_key_enc TEXT,
    gemini_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense','income')),
    color TEXT NOT NULL DEFAULT '#64748b',
    UNIQUE (user_id, name, type)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense','income')),
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    debt_id TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions (user_id, date)`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    UNIQUE (user_id, category_id)
  )`,
  `CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    creditor TEXT,
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
    due_date TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

type G = typeof globalThis & { __moneta?: { client: Client; ready: Promise<void> } };

function create(): { client: Client; ready: Promise<void> } {
  let url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  if (!url) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new Error(
        "TURSO_DATABASE_URL não configurada. Configure o banco Turso nas variáveis de ambiente (veja o README).",
      );
    }
    url = "file:./data/moneta.db";
    mkdirSync("data", { recursive: true }); // garante a pasta local
  }
  const client = createClient({ url, authToken });
  const ready = (async () => {
    await client.execute("PRAGMA foreign_keys = ON").catch(() => {});
    await client.batch(SCHEMA, "write");
  })();
  ready.catch(() => {});
  return { client, ready };
}

function ctx() {
  const g = globalThis as G;
  if (!g.__moneta) g.__moneta = create();
  return g.__moneta;
}

export async function db(): Promise<Client> {
  const c = ctx();
  try {
    await c.ready;
  } catch (e) {
    (globalThis as G).__moneta = undefined; // permite nova tentativa
    throw e;
  }
  // Turso/libSQL em modo remoto ignora PRAGMA por conexão; FKs são aplicadas manualmente onde importa.
  return c.client;
}

export type Row = Record<string, unknown>;

export async function query<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row })) as unknown as T[];
}

export async function queryOne<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await query<T>(sql, args))[0];
}

export async function exec(sql: string, args: InValue[] = []) {
  const c = await db();
  return c.execute({ sql, args });
}

export async function batch(stmts: { sql: string; args?: InValue[] }[]) {
  const c = await db();
  return c.batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
}

export const uid = () => crypto.randomUUID();
