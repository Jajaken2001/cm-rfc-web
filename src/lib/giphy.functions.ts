import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
  width: number;
  height: number;
}

export const searchGifs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input?.query ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<{ gifs: GifResult[]; error?: string }> => {
    const key = process.env["GIPHY_API_KEY"];
    if (!key) return { gifs: [], error: "GIF search is not configured yet." };

    const q = data.query.trim();
    const base = q
      ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&`
      : "https://api.giphy.com/v1/gifs/trending?";
    const url = `${base}api_key=${encodeURIComponent(key)}&limit=24&rating=pg-13&bundle=messaging_non_clips`;

    const res = await fetch(url);
    if (!res.ok) {
      return { gifs: [], error: `GIPHY request failed (${res.status})` };
    }
    const body = (await res.json()) as {
      data?: {
        id: string;
        title?: string;
        images?: Record<string, { url?: string; width?: string; height?: string }>;
      }[];
    };
    const gifs: GifResult[] = (body.data ?? [])
      .map((g) => {
        const full = g.images?.["downsized_medium"] ?? g.images?.["original"];
        const preview = g.images?.["fixed_width_small"] ?? full;
        return {
          id: g.id,
          url: full?.url ?? "",
          previewUrl: preview?.url ?? full?.url ?? "",
          title: g.title ?? "GIF",
          width: Number(full?.width ?? 0),
          height: Number(full?.height ?? 0),
        };
      })
      .filter((g) => g.url.length > 0);

    return { gifs };
  });
