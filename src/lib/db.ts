import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * Camada de banco de dados (libSQL / Turso).
 * - Produção (Vercel): configure TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * - Se as variáveis do Turso não estiverem presentes, usa fallback no diretório temporário
 *   (para permitir testes sem crash imediato) e orienta a configuração do Turso.
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
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking','savings','credit_card','cash','investment')),
    institution TEXT,
    balance_cents INTEGER NOT NULL DEFAULT 0,
    credit_limit_cents INTEGER,
    closing_day INTEGER,
    due_day INTEGER,
    color TEXT NOT NULL DEFAULT '#10b981',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    current_cents INTEGER NOT NULL DEFAULT 0 CHECK (current_cents >= 0),
    deadline TEXT,
    color TEXT NOT NULL DEFAULT '#10b981',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

type G = typeof globalThis & { __moneta?: { client: Client; ready: Promise<void> } };

function create(): { client: Client; ready: Promise<void> } {
  let url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "") || undefined;

  if (!url) {
    const baseDir = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), "data");
    try {
      mkdirSync(baseDir, { recursive: true });
    } catch {
      /* ignore */
    }
    url = `file:${path.join(baseDir, "moneta.db")}`;
  }

  const client = createClient({ url, authToken });
  const ready = (async () => {
    try {
      await client.execute("PRAGMA foreign_keys = ON");
    } catch {
      /* ignorado em Turso remoto */
    }
    for (const sql of SCHEMA) {
      try {
        await client.execute(sql);
      } catch (err) {
        console.warn("[db schema warn]", err);
      }
    }
    const migrations = [
      "ALTER TABLE transactions ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL",
      "ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0",
      "ALTER TABLE transactions ADD COLUMN installment_current INTEGER",
      "ALTER TABLE transactions ADD COLUMN installment_total INTEGER",
      "ALTER TABLE transactions ADD COLUMN parent_tx_id TEXT",
    ];
    for (const m of migrations) {
      try {
        await client.execute(m);
      } catch {
        /* coluna já existe */
      }
    }
  })();

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
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Falha no banco de dados: ${msg}. Verifique as variáveis TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.`);
  }
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
