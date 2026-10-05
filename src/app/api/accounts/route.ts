import { route, json, accountInput } from "@/lib/api";
import { createAccount, listAccounts } from "@/lib/repo";

export const runtime = "nodejs";

export const GET = route(async (user) => {
  const items = await listAccounts(user.id);
  return { items };
});

export const POST = route(async (user, req) => {
  const data = await json(req, accountInput);
  const id = await createAccount(user.id, data);
  return { id };
});
