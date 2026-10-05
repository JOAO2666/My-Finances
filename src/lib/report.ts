import {
  categoryBreakdown,
  listBudgets,
  listDebts,
  listTransactions,
  summary,
  type BudgetStatus,
  type CategoryTotal,
  type Debt,
  type Summary,
  type Transaction,
} from "./repo";

export type Report = {
  userName: string;
  from: string;
  to: string;
  summary: Summary;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  transactions: Transaction[];
  budgets: BudgetStatus[];
  budgetMonth: string;
  debts: Debt[];
};

export async function buildReport(userId: string, userName: string, from: string, to: string): Promise<Report> {
  const budgetMonth = to.slice(0, 7);
  const [s, expenseByCategory, incomeByCategory, transactions, budgets, debts] = await Promise.all([
    summary(userId, from, to),
    categoryBreakdown(userId, from, to, "expense"),
    categoryBreakdown(userId, from, to, "income"),
    listTransactions(userId, { from, to }),
    listBudgets(userId, budgetMonth),
    listDebts(userId),
  ]);
  return { userName, from, to, summary: s, expenseByCategory, incomeByCategory, transactions, budgets, budgetMonth, debts };
}
