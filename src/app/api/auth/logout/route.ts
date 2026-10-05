import { route } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(
  async () => {
    await destroySession();
    return { ok: true };
  },
  { auth: false },
);
