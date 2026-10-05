import { z } from "zod";
import { route, json, zCents, assertOwnCategory, HttpError } from "@/lib/api";
import { upsertBudget } from "@/lib/repo";

export const runtime = "nodejs";

export const POST = route(async (user, req) => {
  const d = await json(req, z.object({ categoryId: z.string().min(1), amountCents: zCents }));
  if (d.amountCents <= 0) throw new HttpError("Informe um limite maior que zero.");
  await assertOwnCategory(user.id, d.categoryId, "expense");
  await upsertBudget(user.id, d.categoryId, d.amountCents);
  return { ok: true };
});
