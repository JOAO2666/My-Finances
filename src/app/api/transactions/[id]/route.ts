import { route, json, txInput, assertOwnCategory } from "@/lib/api";
import { deleteTransaction, updateTransaction } from "@/lib/repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (user, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const data = await json(req, txInput.partial());
  if (data.categoryId) await assertOwnCategory(user.id, data.categoryId, data.type);
  await updateTransaction(user.id, id, data);
  return { ok: true };
});

export const DELETE = route(async (user, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteTransaction(user.id, id);
  return { ok: true };
});
