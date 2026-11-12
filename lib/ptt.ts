import { fetchNewsSource, type NewsSource } from "./news-feeds.ts";
import type { NewsCategory } from "./news.ts";

export const pttCategories = {
  all: "全部",
  life: "生活",
  anime: "動漫",
  games: "遊戲",
  tech: "科技",
  movies: "電影",
} as const;

export type PttCategory = Exclude<keyof typeof pttCategories, "all">;
export type PttHotItem = {
  id: string;
  title: string;
  url: string;
  board: string;
  category: PttCategory;
  publishedAt: string;
  pushScore: number;
};
export type PttHotResponse = { items: PttHotItem[]; unavailableBoards: string[] };
export type PttBoard = { board: string; category: PttCategory; newsCategory: NewsCategory };

export const pttBoards: PttBoard[] = [
  { board: "WomenTalk", category: "life", newsCategory: "topics" },
  { board: "Lifeismoney", category: "life", newsCategory: "topics" },
  { board: "C_Chat", category: "anime", newsCategory: "anime" },
  { board: "Steam", category: "games", newsCategory: "games" },
  { board: "PlayStation", category: "games", newsCategory: "games" },
  { board: "MobileComm", category: "tech", newsCategory: "topics" },
  { board: "PC_Shopping", category: "tech", newsCategory: "topics" },
  { board: "movie", category: "movies", newsCategory: "topics" },
];

const MAX_HTML_BYTES = 1_000_000;
const MAX_POST_AGE_MS = 48 * 60 * 60 * 1000;
const PTT_ORIGIN = "https://www.ptt.cc";

/** Parse publicly visible PTT listing push markers; "爆" is at least 100 net pushes. */
export function parsePttIndex(html: string, board: string): Map<string, number> {
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) throw new Error("PTT listing too large");
  const result = new Map<string, number>();
  const sections = html.split(/<div\b[^>]*class=["'][^"']*\br-ent\b[^"']*["'][^>]*>/i).slice(1);
  for (const section of sections) {
    const title = section.match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    const href = title.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1];
    if (!href || !/^\/bbs\/[A-Za-z0-9_]+\/M\.\d+\.A\.[A-Za-z0-9]+\.html$/.test(href)) continue;
    if (href.split("/")[2] !== board) continue;
    const record = section.match(/<div\b[^>]*class=["'][^"']*\bnrec\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    const label = record.replace(/<[^>]+>/g, "").trim();
    const pushScore = label === "爆" ? 100 : /^\d{1,2}$/.test(label) ? Number(label) : 0;
    result.set(PTT_ORIGIN + href, pushScore);
  }
  return result;
}

async function fetchPttListing(board: string): Promise<string> {
  const response = await fetch(PTT_ORIGIN + "/bbs/" + board + "/index.html", {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0 (compatible; Feifei/1.0; +https://github.com/NTUT-Vincent/feifei.)", Cookie: "over18=1" },
  });
  if (!response.ok || !response.body) throw new Error("PTT listing HTTP " + response.status);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_HTML_BYTES) throw new Error("PTT listing too large");
      chunks.push(next.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchPttBoard(config: PttBoard, now = Date.now()): Promise<PttHotItem[]> {
  const source: NewsSource = {
    name: "PTT " + config.board,
    url: PTT_ORIGIN + "/atom/" + config.board + ".xml",
    host: "ptt.cc",
    language: "zh",
    category: config.newsCategory,
  };
  const [posts, html] = await Promise.all([fetchNewsSource(source), fetchPttListing(config.board)]);
  const scores = parsePttIndex(html, config.board);
  if (!scores.size) throw new Error("Missing public PTT push markers");
  return posts.flatMap((post): PttHotItem[] => {
    const score = scores.get(post.url);
    const age = now - Date.parse(post.publishedAt);
    if (score === undefined || score <= 0 || age < 0 || age > MAX_POST_AGE_MS) return [];
    return [{
      id: post.id,
      title: post.title,
      url: post.url,
      board: config.board,
      category: config.category,
      publishedAt: post.publishedAt,
      pushScore: score,
    }];
  });
}

/** Within each topic, rank by net push marker, then mix topics for variety. */
export function rankPttHot(items: PttHotItem[]): PttHotItem[] {
  const unique = new Map<string, PttHotItem>();
  for (const item of items) {
    if (!unique.has(item.url) || item.pushScore > unique.get(item.url)!.pushScore) unique.set(item.url, item);
  }
  const categories = Object.keys(pttCategories).filter((value) => value !== "all") as PttCategory[];
  const groups = categories.map((category) => [...unique.values()]
    .filter((item) => item.category === category)
    .sort((a, b) => b.pushScore - a.pushScore || b.publishedAt.localeCompare(a.publishedAt)));
  const mixed: PttHotItem[] = [];
  for (let index = 0; groups.some((group) => group.length > index); index++) {
    for (const group of groups) if (group[index]) mixed.push(group[index]);
  }
  return mixed.slice(0, 90);
}

export async function collectPttHot(load = fetchPttBoard): Promise<PttHotResponse> {
  const results = await Promise.allSettled(pttBoards.map((board) => load(board)));
  const items: PttHotItem[] = [];
  const unavailableBoards: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else {
      unavailableBoards.push(pttBoards[index].board);
      console.warn("PTT board unavailable", pttBoards[index].board, result.reason instanceof Error ? result.reason.message : "unknown");
    }
  });
  return { items: rankPttHot(items), unavailableBoards };
}
