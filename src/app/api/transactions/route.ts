import { z } from "zod";
import { route, json, txInput, assertOwnCategory } from "@/lib/api";
import { createTransaction, listTransactions } from "@/lib/repo";
import { isDate } from "@/lib/format";

export const runtime = "nodejs";

export const GET = route(async (user, req) => {
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const type = sp.get("type");
  const status = sp.get("status");
  const items = await listTransactions(user.id, {
    from: isDate(from) ? from : undefined,
    to: isDate(to) ? to : undefined,
    type: type === "expense" || type === "income" ? type : undefined,
    status: status === "paid" || status === "pending" ? status : undefined,
    categoryId: sp.get("categoryId") || undefined,
    q: sp.get("q") || undefined,
    limit: 2000,
  });
  return { items };
});

export const POST = route(async (user, req) => {
  const data = await json(req, txInput.extend({ source: z.string().max(20).optional() }));
  await assertOwnCategory(user.id, data.categoryId, data.type);
  const id = await createTransaction(user.id, { ...data, source: data.source ?? "manual" });
  return { id };
});
