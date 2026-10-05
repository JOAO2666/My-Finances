import { route, json, accountInput } from "@/lib/api";
import { deleteAccountEntity, updateAccount } from "@/lib/repo";

export const runtime = "nodejs";

export const PATCH = route(async (user, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await json(req, accountInput.partial());
  await updateAccount(user.id, id, data);
  return { ok: true };
});

export const DELETE = route(async (user, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await deleteAccountEntity(user.id, id);
  return { ok: true };
});
