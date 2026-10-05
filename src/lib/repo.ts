import { batch, exec, query, queryOne, uid } from "./db";
import { DEFAULT_CATEGORIES } from "./categories";
import { monthRange, shiftMonth, today } from "./format";

export type TxType = "expense" | "income";
export type TxStatus = "paid" | "pending";

export type Category = { id: string; name: string; type: TxType; color: string };

export type Transaction = {
  id: string;
  type: TxType;
  description: string;
  amountCents: number;
  date: string;
  status: TxStatus;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  debtId: string | null;
  source: string;
  notes: string | null;
};

export type Debt = {
  id: string;
  name: string;
  creditor: string | null;
  totalCents: number;
  paidCents: number;
  dueDate: string | null;
  notes: string | null;
  source: string;
};

/* ------------------------------- Categorias ------------------------------- */

export async function seedCategories(userId: string) {
  await batch(
    DEFAULT_CATEGORIES.map((c) => ({
      sql: "INSERT OR IGNORE INTO categories (id, user_id, name, type, color) VALUES (?,?,?,?,?)",
      args: [uid(), userId, c.name, c.type, c.color],
    })),
  );
}

export async function listCategories(userId: string): Promise<Category[]> {
  const rows = await query<{ id: string; name: string; type: TxType; color: string }>(
    "SELECT id, name, type, color FROM categories WHERE user_id = ? ORDER BY type DESC, name",
    [userId],
  );
  return rows;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Resolve o nome (texto livre da IA) para uma categoria existente do usuário. */
export function matchCategory(cats: Category[], name: string | null | undefined, type: TxType): Category | null {
  const ofType = cats.filter((c) => c.type === type);
  if (name) {
    const n = norm(name);
    const exact = ofType.find((c) => norm(c.name) === n);
    if (exact) return exact;
    const partial = ofType.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name).split(" ")[0]));
    if (partial) return partial;
  }
  return ofType.find((c) => c.name === (type === "expense" ? "Outros" : "Outras receitas")) ?? null;
}

export async function createCategory(userId: string, name: string, type: TxType, color: string) {
  const id = uid();
  await exec("INSERT INTO categories (id, user_id, name, type, color) VALUES (?,?,?,?,?)", [id, userId, name, type, color]);
  return id;
}

export async function deleteCategory(userId: string, id: string) {
  await exec("UPDATE transactions SET category_id = NULL WHERE user_id = ? AND category_id = ?", [userId, id]);
  await exec("DELETE FROM budgets WHERE user_id = ? AND category_id = ?", [userId, id]);
  await exec("DELETE FROM categories WHERE user_id = ? AND id = ?", [userId, id]);
}

/* ------------------------------ Lançamentos ------------------------------- */

type TxRow = {
  id: string;
  type: TxType;
  description: string;
  amount_cents: number;
  date: string;
  status: TxStatus;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  debt_id: string | null;
  source: string;
  notes: string | null;
};

const mapTx = (r: TxRow): Transaction => ({
  id: r.id,
  type: r.type,
  description: r.description,
  amountCents: Number(r.amount_cents),
  date: r.date,
  status: r.status,
  categoryId: r.category_id,
  categoryName: r.category_name,
  categoryColor: r.category_color,
  debtId: r.debt_id,
  source: r.source,
  notes: r.notes,
});

const TX_SELECT = `SELECT t.id, t.type, t.description, t.amount_cents, t.date, t.status, t.category_id, t.debt_id, t.source, t.notes,
  c.name AS category_name, c.color AS category_color
  FROM transactions t LEFT JOIN categories c ON c.id = t.category_id`;

export type TxFilter = {
  from?: string;
  to?: string;
  type?: TxType;
  status?: TxStatus;
  categoryId?: string;
  q?: string;
  limit?: number;
};

export async function listTransactions(userId: string, f: TxFilter = {}): Promise<Transaction[]> {
  const where = ["t.user_id = ?"];
  const args: (string | number)[] = [userId];
  if (f.from) (where.push("t.date >= ?"), args.push(f.from));
  if (f.to) (where.push("t.date <= ?"), args.push(f.to));
  if (f.type) (where.push("t.type = ?"), args.push(f.type));
  if (f.status) (where.push("t.status = ?"), args.push(f.status));
  if (f.categoryId) (where.push("t.category_id = ?"), args.push(f.categoryId));
  if (f.q) (where.push("t.description LIKE ?"), args.push(`%${f.q}%`));
  const limit = f.limit ? ` LIMIT ${Math.max(1, Math.min(5000, f.limit | 0))}` : "";
  const rows = await query<TxRow>(`${TX_SELECT} WHERE ${where.join(" AND ")} ORDER BY t.date DESC, t.created_at DESC${limit}`, args);
  return rows.map(mapTx);
}

export type TxInput = {
  type: TxType;
  description: string;
  amountCents: number;
  date: string;
  status: TxStatus;
  categoryId: string | null;
  notes?: string | null;
  debtId?: string | null;
  source?: string;
};

export async function createTransaction(userId: string, t: TxInput): Promise<string> {
  const id = uid();
  await exec(
    `INSERT INTO transactions (id, user_id, type, description, amount_cents, date, status, category_id, debt_id, source, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, userId, t.type, t.description, t.amountCents, t.date, t.status, t.categoryId, t.debtId ?? null, t.source ?? "manual", t.notes ?? null],
  );
  return id;
}

export async function updateTransaction(userId: string, id: string, t: Partial<TxInput>) {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const map: [keyof TxInput, string][] = [
    ["type", "type"],
    ["description", "description"],
    ["amountCents", "amount_cents"],
    ["date", "date"],
    ["status", "status"],
    ["categoryId", "category_id"],
    ["notes", "notes"],
  ];
  for (const [k, col] of map) {
    if (t[k] !== undefined) (sets.push(`${col} = ?`), args.push(t[k] as string | number | null));
  }
  if (!sets.length) return;
  args.push(userId, id);
  await exec(`UPDATE transactions SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`, args);
}

export async function deleteTransaction(userId: string, id: string) {
  await exec("DELETE FROM transactions WHERE user_id = ? AND id = ?", [userId, id]);
}

/* -------------------------------- Resumos --------------------------------- */

export type Summary = {
  incomePaid: number;
  incomePending: number;
  expensePaid: number;
  expensePending: number;
  income: number;
  expense: number;
  balanceRealized: number;
  balanceForecast: number;
};

export async function summary(userId: string, from: string, to: string): Promise<Summary> {
  const rows = await query<{ type: TxType; status: TxStatus; total: number }>(
    `SELECT type, status, COALESCE(SUM(amount_cents),0) AS total FROM transactions
     WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY type, status`,
    [userId, from, to],
  );
  const g = (t: TxType, s: TxStatus) => Number(rows.find((r) => r.type === t && r.status === s)?.total ?? 0);
  const incomePaid = g("income", "paid");
  const incomePending = g("income", "pending");
  const expensePaid = g("expense", "paid");
  const expensePending = g("expense", "pending");
  return {
    incomePaid,
    incomePending,
    expensePaid,
    expensePending,
    income: incomePaid + incomePending,
    expense: expensePaid + expensePending,
    balanceRealized: incomePaid - expensePaid,
    balanceForecast: incomePaid + incomePending - expensePaid - expensePending,
  };
}

export type CategoryTotal = { categoryId: string | null; name: string; color: string; total: number };

export async function categoryBreakdown(userId: string, from: string, to: string, type: TxType): Promise<CategoryTotal[]> {
  const rows = await query<{ category_id: string | null; name: string | null; color: string | null; total: number }>(
    `SELECT t.category_id, c.name, c.color, COALESCE(SUM(t.amount_cents),0) AS total
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = ? AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id ORDER BY total DESC`,
    [userId, type, from, to],
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    name: r.name ?? "Sem categoria",
    color: r.color ?? "#94a3b8",
    total: Number(r.total),
  }));
}

export type MonthPoint = { month: string; income: number; expense: number };

export async function monthlySeries(userId: string, endMonth: string, n = 6): Promise<MonthPoint[]> {
  const startMonth = shiftMonth(endMonth, -(n - 1));
  const rows = await query<{ m: string; type: TxType; total: number }>(
    `SELECT substr(date,1,7) AS m, type, COALESCE(SUM(amount_cents),0) AS total FROM transactions
     WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY m, type`,
    [userId, monthRange(startMonth).from, monthRange(endMonth).to],
  );
  return Array.from({ length: n }, (_, i) => {
    const month = shiftMonth(startMonth, i);
    const v = (t: TxType) => Number(rows.find((r) => r.m === month && r.type === t)?.total ?? 0);
    return { month, income: v("income"), expense: v("expense") };
  });
}

/* ------------------------------- Orçamentos ------------------------------- */

export type BudgetStatus = {
  id: string;
  categoryId: string;
  categoryName: string;
  color: string;
  limitCents: number;
  spentCents: number;
};

export async function listBudgets(userId: string, month: string): Promise<BudgetStatus[]> {
  const { from, to } = monthRange(month);
  const rows = await query<{ id: string; category_id: string; name: string; color: string; amount_cents: number; spent: number }>(
    `SELECT b.id, b.category_id, c.name, c.color, b.amount_cents,
       COALESCE((SELECT SUM(t.amount_cents) FROM transactions t
         WHERE t.user_id = b.user_id AND t.category_id = b.category_id AND t.type = 'expense'
         AND t.date >= ? AND t.date <= ?), 0) AS spent
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? ORDER BY c.name`,
    [from, to, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.name,
    color: r.color,
    limitCents: Number(r.amount_cents),
    spentCents: Number(r.spent),
  }));
}

export async function upsertBudget(userId: string, categoryId: string, amountCents: number) {
  await exec(
    `INSERT INTO budgets (id, user_id, category_id, amount_cents) VALUES (?,?,?,?)
     ON CONFLICT(user_id, category_id) DO UPDATE SET amount_cents = excluded.amount_cents`,
    [uid(), userId, categoryId, amountCents],
  );
}

export async function deleteBudget(userId: string, id: string) {
  await exec("DELETE FROM budgets WHERE user_id = ? AND id = ?", [userId, id]);
}

/* --------------------------------- Dívidas -------------------------------- */

type DebtRow = {
  id: string;
  name: string;
  creditor: string | null;
  total_cents: number;
  paid_cents: number;
  due_date: string | null;
  notes: string | null;
  source: string;
};

const mapDebt = (r: DebtRow): Debt => ({
  id: r.id,
  name: r.name,
  creditor: r.creditor,
  totalCents: Number(r.total_cents),
  paidCents: Number(r.paid_cents),
  dueDate: r.due_date,
  notes: r.notes,
  source: r.source,
});

export async function listDebts(userId: string): Promise<Debt[]> {
  const rows = await query<DebtRow>(
    "SELECT id, name, creditor, total_cents, paid_cents, due_date, notes, source FROM debts WHERE user_id = ? ORDER BY (paid_cents >= total_cents), due_date IS NULL, due_date",
    [userId],
  );
  return rows.map(mapDebt);
}

export async function createDebt(
  userId: string,
  d: { name: string; creditor?: string | null; totalCents: number; paidCents?: number; dueDate?: string | null; notes?: string | null; source?: string },
) {
  const id = uid();
  await exec(
    "INSERT INTO debts (id, user_id, name, creditor, total_cents, paid_cents, due_date, notes, source) VALUES (?,?,?,?,?,?,?,?,?)",
    [id, userId, d.name, d.creditor ?? null, d.totalCents, d.paidCents ?? 0, d.dueDate ?? null, d.notes ?? null, d.source ?? "manual"],
  );
  return id;
}

export async function updateDebt(
  userId: string,
  id: string,
  d: { name?: string; creditor?: string | null; totalCents?: number; dueDate?: string | null; notes?: string | null },
) {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (d.name !== undefined) (sets.push("name = ?"), args.push(d.name));
  if (d.creditor !== undefined) (sets.push("creditor = ?"), args.push(d.creditor));
  if (d.totalCents !== undefined) (sets.push("total_cents = ?"), args.push(d.totalCents));
  if (d.dueDate !== undefined) (sets.push("due_date = ?"), args.push(d.dueDate));
  if (d.notes !== undefined) (sets.push("notes = ?"), args.push(d.notes));
  if (!sets.length) return;
  args.push(userId, id);
  await exec(`UPDATE debts SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`, args);
}

export async function deleteDebt(userId: string, id: string) {
  await exec("UPDATE transactions SET debt_id = NULL WHERE user_id = ? AND debt_id = ?", [userId, id]);
  await exec("DELETE FROM debts WHERE user_id = ? AND id = ?", [userId, id]);
}

/** Registra um pagamento: soma ao pago e gera a despesa correspondente. */
export async function payDebt(userId: string, id: string, amountCents: number, date: string, categoryId: string | null) {
  const d = await queryOne<DebtRow>("SELECT id, name, creditor, total_cents, paid_cents, due_date, notes, source FROM debts WHERE user_id = ? AND id = ?", [userId, id]);
  if (!d) return false;
  await batch([
    { sql: "UPDATE debts SET paid_cents = paid_cents + ? WHERE user_id = ? AND id = ?", args: [amountCents, userId, id] },
    {
      sql: `INSERT INTO transactions (id, user_id, type, description, amount_cents, date, status, category_id, debt_id, source)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [uid(), userId, "expense", `Pagamento: ${d.name}`, amountCents, date, "paid", categoryId, id, "manual"],
    },
  ]);
  return true;
}

/* ------------------------ Contas a pagar (pendentes) ---------------------- */

export async function upcomingBills(userId: string, limit = 8): Promise<Transaction[]> {
  const rows = await query<TxRow>(
    `${TX_SELECT} WHERE t.user_id = ? AND t.type = 'expense' AND t.status = 'pending' ORDER BY t.date ASC LIMIT ${limit | 0}`,
    [userId],
  );
  return rows.map(mapTx);
}

export const isOverdue = (t: { status: TxStatus; date: string }) => t.status === "pending" && t.date < today();

/* --------------------------- Conta / configurações ------------------------ */

export async function deleteAccount(userId: string) {
  await batch([
    { sql: "DELETE FROM transactions WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM budgets WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM debts WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM categories WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM users WHERE id = ?", args: [userId] },
  ]);
}
