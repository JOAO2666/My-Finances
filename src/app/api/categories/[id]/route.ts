import { route } from "@/lib/api";
import { deleteCategory } from "@/lib/repo";

export const runtime = "nodejs";

export const DELETE = route(async (user, _req, ctx: { params: Promise<{ id: string }> }) => {
  await deleteCategory(user.id, (await ctx.params).id);
  return { ok: true };
});
