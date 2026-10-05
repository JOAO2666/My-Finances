import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { createCategory } from "@/lib/repo";

export const runtime = "nodejs";

export const POST = route(async (user, req) => {
  const d = await json(
    req,
    z.object({
      name: z.string().trim().min(1, "Informe o nome.").max(40),
      type: z.enum(["expense", "income"]),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.").default("#64748b"),
    }),
  );
  try {
    return { id: await createCategory(user.id, d.name, d.type, d.color) };
  } catch {
    throw new HttpError("Já existe uma categoria com esse nome.", 409);
  }
});
