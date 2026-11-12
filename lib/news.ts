export const newsCategories = {
  all: "全部", anime: "動漫", music: "音樂", memes: "迷因", games: "遊戲", topics: "話題",
} as const;
export type NewsCategory = Exclude<keyof typeof newsCategories, "all">;
export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  category: NewsCategory;
  publishedAt: string;
};
export type NewsResponse = {
  items: NewsItem[];
  unavailableSources: string[];
};

/** Interleave recent items by category so a high-volume feed cannot fill the wall. */
export function mixNews(items: NewsItem[]): NewsItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).filter((item) => {
    const title = item.title.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
    if (seenUrls.has(item.url) || seenTitles.has(title)) return false;
    seenUrls.add(item.url);
    seenTitles.add(title);
    return true;
  });
  const groups = Object.keys(newsCategories).filter((key) => key !== "all")
    .map((category) => unique.filter((item) => item.category === category));
  const mixed: NewsItem[] = [];
  for (let i = 0; groups.some((group) => i < group.length); i++) {
    for (const group of groups) if (group[i]) mixed.push(group[i]);
  }
  return mixed;
}
