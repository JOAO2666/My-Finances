import { z } from "zod";
import { route, json, goalInput } from "@/lib/api";
import { contributeGoal, deleteGoal, updateGoal } from "@/lib/repo";

export const runtime = "nodejs";

const patchSchema = goalInput.partial().extend({
  contributeCents: z.number().int().optional(),
});

export const PATCH = route(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await json(req, patchSchema);

  if (data.contributeCents !== undefined && data.contributeCents !== 0) {
    await contributeGoal(user.id, id, data.contributeCents);
  }

  const { contributeCents, ...rest } = data;
  if (Object.keys(rest).length > 0) {
    await updateGoal(user.id, id, rest);
  }

  return { ok: true };
});

export const DELETE = route(async (user, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await deleteGoal(user.id, id);
  return { ok: true };
});
