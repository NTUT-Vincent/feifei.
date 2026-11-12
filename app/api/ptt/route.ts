import { unstable_cache } from "next/cache";
import { collectPttPosts, collectPttHot, fetchPttBoard, fetchPttHotBoard, type PttBoard } from "../../../lib/ptt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cachedBoard = unstable_cache(
  (board: PttBoard) => fetchPttBoard(board),
  ["ptt-hot-v1"],
  { revalidate: 900 },
);

const cachedHotBoard = unstable_cache(
  (board: PttBoard) => fetchPttHotBoard(board),
  ["ptt-hot-list-v1"],
  { revalidate: 900 },
);

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") === "latest" ? "latest" : "hot";
  const result = mode === "hot" ? await collectPttHot(cachedHotBoard) : await collectPttPosts(cachedBoard);
  const failed = result.unavailableBoards.length > 0;
  return Response.json(result, {
    status: !result.items.length && failed ? 503 : 200,
    headers: {
      "Cache-Control": failed ? "no-store" : "public, s-maxage=900, stale-while-revalidate=60",
    },
  });
}
