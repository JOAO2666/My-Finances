import { route, json, goalInput } from "@/lib/api";
import { createGoal, listGoals } from "@/lib/repo";

export const runtime = "nodejs";

export const GET = route(async (user) => {
  const items = await listGoals(user.id);
  return { items };
});

export const POST = route(async (user, req) => {
  const data = await json(req, goalInput);
  const id = await createGoal(user.id, data);
  return { id };
});
