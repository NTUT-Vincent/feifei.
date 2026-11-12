import { unstable_cache } from "next/cache";
import { collectPttHot, fetchPttBoard, type PttBoard } from "../../../lib/ptt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cachedBoard = unstable_cache(
  (board: PttBoard) => fetchPttBoard(board),
  ["ptt-hot-v1"],
  { revalidate: 900 },
);

export async function GET() {
  const result = await collectPttHot(cachedBoard);
  const failed = result.unavailableBoards.length > 0;
  return Response.json(result, {
    status: !result.items.length && failed ? 503 : 200,
    headers: {
      "Cache-Control": failed ? "no-store" : "public, s-maxage=900, stale-while-revalidate=60",
    },
  });
}
