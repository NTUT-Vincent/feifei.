import Parser from "rss-parser";
import { mixNews, type NewsCategory, type NewsItem, type NewsResponse } from "./news.ts";

export type NewsSource = { name: string; url: string; host: string; category: NewsCategory };
export const newsSources: NewsSource[] = [
  { name: "巴哈姆特 GNN", url: "https://gnn.gamer.com.tw/rss.xml", host: "gnn.gamer.com.tw", category: "games" },
  { name: "NME Music", url: "https://www.nme.com/news/music/feed", host: "nme.com", category: "music" },
  { name: "4Gamers", url: "https://www.4gamers.com.tw/rss/latest-news", host: "4gamers.com.tw", category: "games" },
  { name: "Anime News Network", url: "https://www.animenewsnetwork.com/news/rss.xml?ann-edition=us", host: "animenewsnetwork.com", category: "anime" },
  { name: "吹音樂", url: "https://blow.streetvoice.com/feed/", host: "blow.streetvoice.com", category: "music" },
  { name: "Know Your Meme", url: "https://knowyourmeme.com/memes.rss", host: "knowyourmeme.com", category: "memes" },
  { name: "Know Your Meme 話題", url: "https://knowyourmeme.com/newsfeed.rss", host: "knowyourmeme.com", category: "topics" },
];
const parser = new Parser();
const MAX_BYTES = 2_000_000;
const MAX_AGE = 14 * 24 * 60 * 60 * 1000;
const excluded = /緋聞|出軌|偷吃|婚變|戀情|離婚|八卦|拔作|成人遊戲|色情|痴女|\b(?:NSFW|porn|hentai|NTR|dating|divorce|affair|cheating)\b/i;

export async function parseNewsFeed(xml: string, source: NewsSource, now = Date.now()): Promise<NewsItem[]> {
  if (Buffer.byteLength(xml) > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported feed");
  const feed = await parser.parseString(xml);
  if (!feed.items?.length) throw new Error("Empty feed");
  return feed.items.slice(0, 100).flatMap((entry): NewsItem[] => {
    const title = entry.title?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
    const published = Date.parse(entry.isoDate ?? entry.pubDate ?? "");
    if (!title || excluded.test(title) || !Number.isFinite(published) || now - published > MAX_AGE || published > now + 300_000) return [];
    let url: URL;
    try { url = new URL(entry.link ?? ""); } catch { return []; }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      !(url.hostname === source.host || url.hostname.endsWith(`.${source.host}`))) return [];
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    let category = source.category;
    if (source.name === "Anime News Network" && /\b(?:game|games|gaming|playstation|nintendo|steam|xbox)\b/i.test(title)) category = "games";
    if (source.name === "4Gamers" || source.name === "巴哈姆特 GNN") {
      if (/動畫|漫畫|新番|聲優|劇場版|動漫|\\b(?:anime|manga)\\b/i.test(title)) category = "anime";
      else if (/樂團|演唱會|音樂祭|新專輯/.test(title)) category = "music";
      else if (/迷因|爆紅|網路梗/.test(title)) category = "topics";
    }
    return [{ id: url.href, title, url: url.href, source: source.name, category, publishedAt: new Date(published).toISOString() }];
  });
}

export async function fetchNewsSource(source: NewsSource): Promise<NewsItem[]> {
  // Fixed server-owned URLs only; users cannot turn this endpoint into a proxy.
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Feifei/1.0 RSS Reader" },
    cache: "no-store",
  });
  if (!response.ok || !response.body) throw new Error("Feed unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Feed too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return parseNewsFeed(Buffer.concat(chunks).toString("utf8"), source);
}

export async function collectNews(load = fetchNewsSource): Promise<NewsResponse> {
  const results = await Promise.allSettled(newsSources.map(load));
  const items: NewsItem[] = [];
  const unavailableSources: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else unavailableSources.push(newsSources[index].name);
  });
  return { items: mixNews(items).slice(0, 100), unavailableSources };
}
