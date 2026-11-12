import { fetchNewsSource, type NewsSource } from "./news-feeds.ts";
import type { NewsCategory } from "./news.ts";

import { pttCategories, type PttCategory, type PttItem, type PttResponse } from "./ptt-shared.ts";
export { pttCategories } from "./ptt-shared.ts";
export type { PttCategory, PttItem, PttResponse } from "./ptt-shared.ts";

export type PttBoard = { board: string; category: PttCategory; newsCategory: NewsCategory };

export const pttBoards: PttBoard[] = [
  { board: "Lifeismoney", category: "life", newsCategory: "topics" },
  { board: "C_Chat", category: "anime", newsCategory: "anime" },
  { board: "Steam", category: "games", newsCategory: "games" },
  { board: "movie", category: "movies", newsCategory: "topics" },
];

const PTT_ORIGIN = "https://www.ptt.cc";
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
  return { items: mixPttPosts(items), unavailableBoards };
}
