import { fetchNewsSource, type NewsSource } from "./news-feeds.ts";
import type { NewsCategory } from "./news.ts";

import { pttCategories, type PttCategory, type PttItem, type PttResponse } from "./ptt-shared.ts";
export { pttCategories } from "./ptt-shared.ts";
export type { PttCategory, PttItem, PttResponse } from "./ptt-shared.ts";

export type PttBoard = { board: string; category: PttCategory; newsCategory: NewsCategory };

export const pttBoards: PttBoard[] = [
  { board: "Lifeismoney", category: "life", newsCategory: "topics" },
  { board: "WomenTalk", category: "life", newsCategory: "topics" },
  { board: "MobileComm", category: "tech", newsCategory: "topics" },
  { board: "PC_Shopping", category: "tech", newsCategory: "topics" },
  { board: "C_Chat", category: "anime", newsCategory: "anime" },
  { board: "Steam", category: "games", newsCategory: "games" },
  { board: "movie", category: "movies", newsCategory: "topics" },
];

const PTT_ORIGIN = "https://www.ptt.cc";
const excludedTitles = /緋聞|出軌|偷吃|婚變|戀情|離婚|八卦|色情|成人|NSFW|\\b(?:porn|hentai|NTR)\\b/i;
const MAX_POST_AGE_MS = 72 * 60 * 60 * 1000;

/** Official Atom feeds provide recent public posts, not push-based hot rankings. */
export async function fetchPttBoard(config: PttBoard, now = Date.now()): Promise<PttItem[]> {
  const source: NewsSource = {
    name: "PTT " + config.board,
    url: PTT_ORIGIN + "/atom/" + config.board + ".xml",
    host: "ptt.cc",
    language: "zh",
    category: config.newsCategory,
  };
  const posts = await fetchNewsSource(source);
  return posts.flatMap((post): PttItem[] => {
    const age = now - Date.parse(post.publishedAt);
    if (age < 0 || age > MAX_POST_AGE_MS) return [];
    return [{
      id: post.id,
      title: post.title,
      url: post.url,
      board: config.board,
      category: config.category,
      publishedAt: post.publishedAt,
    }];
  });
}

/** Balance categories; within each category show newest posts first. */
export function mixPttPosts(items: PttItem[]): PttItem[] {
  const unique = new Map<string, PttItem>();
  for (const item of items) if (!unique.has(item.url)) unique.set(item.url, item);
  const categories = Object.keys(pttCategories).filter((value) => value !== "all") as PttCategory[];
  const groups = categories.map((category) => [...unique.values()]
    .filter((item) => item.category === category)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
  const mixed: PttItem[] = [];
  for (let index = 0; groups.some((group) => group.length > index); index++) {
    for (const group of groups) if (group[index]) mixed.push(group[index]);
  }
  return mixed.slice(0, 90);
}

export async function collectPttPosts(load = fetchPttBoard): Promise<PttResponse> {
  const results = await Promise.allSettled(pttBoards.map((board) => load(board)));
  const items: PttItem[] = [];
  const unavailableBoards: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else {
      unavailableBoards.push(pttBoards[index].board);
      console.warn("PTT Atom feed unavailable", pttBoards[index].board, result.reason instanceof Error ? result.reason.message : "unknown");
    }
  });
  return { items: mixPttPosts(items), unavailableBoards, mode: "latest" };
}

/** PTT public board listing: the nrec badge reflects net pushes, not view counts. */
export function parsePttListing(html: string, config: PttBoard, now = Date.now()): PttItem[] {
  if (html.length > 2_000_000) throw Error("PTT listing too large");
  const results: PttItem[] = [];
  const rows = html.match(/<div class="r-ent">[\s\S]*?(?=<div class="r-ent">|<div class="btn-group btn-group-paging"|$)/g) ?? [];
  for (const row of rows.slice(0, 30)) {
    const anchor = row.match(/<div class="title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const badge = row.match(/<div class="nrec">[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/);
    if (!anchor || !badge) continue;
    const title = anchor[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    const value = badge[1].replace(/<[^>]+>/g, "").trim();
    const heat = value === "爆" ? 100 : /^\d{1,2}$/.test(value) ? Number(value) : null;
    if (heat === null || heat < 1 || !title || excludedTitles.test(title)) continue;
    let url: URL;
    try { url = new URL(anchor[1], PTT_ORIGIN); } catch { continue; }
    if (url.origin !== PTT_ORIGIN || !new RegExp("^/bbs/" + config.board + "/M\\.[0-9]+\\.A\\.[A-Za-z0-9]+\\.html$").test(url.pathname)) continue;
    results.push({ id: url.href, title, url: url.href, board: config.board, category: config.category, publishedAt: new Date(now).toISOString(), heat });
  }
  return results;
}

export async function fetchPttHotBoard(config: PttBoard): Promise<PttItem[]> {
  const response = await fetch(PTT_ORIGIN + "/bbs/" + config.board + "/index.html", {
    signal: AbortSignal.timeout(8_000), cache: "no-store",
    headers: { Accept: "text/html", "User-Agent": "Feifei/1.0 PTT Reader" },
  });
  if (!response.ok) throw Error("PTT listing HTTP " + response.status);
  const html = await response.text();
  return parsePttListing(html, config);
}

export async function collectPttHot(load = fetchPttHotBoard): Promise<PttResponse> {
  const results = await Promise.allSettled(pttBoards.map(load));
  const items: PttItem[] = [];
  const unavailableBoards: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else unavailableBoards.push(pttBoards[index].board);
  });
  const unique = [...new Map(items.map((item) => [item.url, item])).values()];
  return { items: unique.sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0)).slice(0, 90), unavailableBoards, mode: "hot" };
}
