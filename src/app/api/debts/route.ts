import { route, json, debtInput } from "@/lib/api";
import { createDebt } from "@/lib/repo";

export const runtime = "nodejs";

export const POST = route(async (user, req) => {
  const d = await json(req, debtInput);
  return { id: await createDebt(user.id, d) };
});
