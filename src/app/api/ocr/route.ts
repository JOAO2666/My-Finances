import { z } from "zod";
import { route, json, HttpError } from "@/lib/api";
import { getUserGemini } from "@/lib/gemini";
import { extractFromImage, processOcrDocs } from "@/lib/ocr";
import { listCategories } from "@/lib/repo";
import { rateLimit } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]),
  data: z.string().min(100).max(6_000_000),
  /** true: registra direto; false: apenas devolve a prévia */
  save: z.boolean().default(true),
});

export const POST = route(async (user, req) => {
  if (!rateLimit(`ocr:${user.id}`, 30, 60_000)) throw new HttpError("Muitas leituras seguidas. Aguarde um minuto.", 429);
  const d = await json(req, schema);
  const [{ apiKey, model }, categories] = await Promise.all([getUserGemini(user.id), listCategories(user.id)]);
  const docs = await extractFromImage({ apiKey, model, mimeType: d.mimeType, data: d.data, categories });
  const results = await processOcrDocs(user.id, docs, d.save);
  return { results, saved: d.save };
});
