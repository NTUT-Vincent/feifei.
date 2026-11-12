export const pttCategories = {
  all: "全部",
  life: "生活",
  anime: "動漫",
  games: "遊戲",
  tech: "科技",
  movies: "電影",
} as const;

export type PttCategory = Exclude<keyof typeof pttCategories, "all">;
export type PttItem = {
  id: string;
  title: string;
  url: string;
  board: string;
  category: PttCategory;
  publishedAt: string;
  heat?: number;
};
export type PttResponse = { items: PttItem[]; unavailableBoards: string[]; mode: 'hot' | 'latest' };
