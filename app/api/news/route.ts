import { unstable_cache } from "next/cache";
import { collectNews, fetchNewsSource, type NewsSource } from "../../../lib/news-feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Successful sources cache independently. A failing source does not poison the others.
const cachedSource = unstable_cache(
  (source: NewsSource) => fetchNewsSource(source), ["culture-news-v1"], { revalidate: 900 },
);

export async function GET() {
  const news = await collectNews(cachedSource);
  const unavailable = news.unavailableSources.length > 0;
  return Response.json(news, {
    status: !news.items.length && unavailable ? 503 : 200,
    headers: { "Cache-Control": unavailable ? "no-store" : "public, s-maxage=900, stale-while-revalidate=60" },
  });
}
