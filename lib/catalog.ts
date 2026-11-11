export const mediaProviders = ["youtube", "twitch", "spotify"] as const;
export type MediaProvider = (typeof mediaProviders)[number];
export const widgetTypes = [...mediaProviders, "ptt"] as const;
export type WidgetType = (typeof widgetTypes)[number];

export const widgetCatalog = {
  youtube: {
    name: "YouTube",
    sample: "lofi hip hop radio",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    home: "https://www.youtube.com/",
  },
  twitch: {
    name: "Twitch",
    sample: "Twitch 精選剪輯",
    url: "https://clips.twitch.tv/IncredulousAbstemiousFennelImGlitch",
    home: "https://www.twitch.tv/",
  },
  spotify: {
    name: "Spotify",
    sample: "lofi beats",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn",
    home: "https://open.spotify.com/",
  },
  ptt: {
    name: "PTT",
    sample: "熱門看板",
    url: "https://www.ptt.cc/bbs/index.html",
    home: "https://www.ptt.cc/",
  },
} satisfies Record<WidgetType, { name: string; sample: string; url: string; home: string }>;

export const boards = [
  { title: "C_Chat", url: "https://www.ptt.cc/bbs/C_Chat/index.html" },
  { title: "Steam", url: "https://www.ptt.cc/bbs/Steam/index.html" },
  { title: "movie", url: "https://www.ptt.cc/bbs/movie/index.html" },
];

export const themes = [
  { id: "peach", title: "奶油橘", swatch: "#edaf8b" },
  { id: "mint", title: "薄荷綠", swatch: "#a2b78d" },
  { id: "lavender", title: "芋泥紫", swatch: "#b6a0cb" },
] as const;
