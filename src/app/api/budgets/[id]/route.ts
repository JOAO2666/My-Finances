import { route } from "@/lib/api";
import { deleteBudget } from "@/lib/repo";

export const runtime = "nodejs";

export const DELETE = route(async (user, _req, ctx: { params: Promise<{ id: string }> }) => {
  await deleteBudget(user.id, (await ctx.params).id);
  return { ok: true };
});
