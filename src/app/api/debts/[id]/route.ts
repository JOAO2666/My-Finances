import { z } from "zod";
import { route, json, debtInput, zCents, zDate, assertOwnCategory, HttpError } from "@/lib/api";
import { deleteDebt, payDebt, updateDebt } from "@/lib/repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (user, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await json(
    req,
    z.union([
      z.object({ pay: z.object({ amountCents: zCents, date: zDate, categoryId: z.string().nullable().optional() }) }),
      debtInput.partial(),
    ]),
  );
  if ("pay" in body) {
    if (body.pay.amountCents <= 0) throw new HttpError("Informe um valor maior que zero.");
    await assertOwnCategory(user.id, body.pay.categoryId, "expense");
    const ok = await payDebt(user.id, id, body.pay.amountCents, body.pay.date, body.pay.categoryId ?? null);
    if (!ok) throw new HttpError("Dívida não encontrada.", 404);
  } else {
    await updateDebt(user.id, id, body);
  }
  return { ok: true };
});

export const DELETE = route(async (user, _req, ctx: Ctx) => {
  await deleteDebt(user.id, (await ctx.params).id);
  return { ok: true };
});
