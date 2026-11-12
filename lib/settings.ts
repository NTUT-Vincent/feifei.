import { z } from "zod";
import { themes, widgetCatalog, widgetTypes, type WidgetType } from "./catalog.ts";
import { resolveEmbed } from "./embeds.ts";
import { parseWebUrl } from "./urls.ts";

export const STORAGE_KEY = "feifei.settings";
export const MAX_WIDGETS = 12;
export const MAX_SHORTCUTS = 16;
export const shortcutIcons = ["link", "youtube", "twitch", "spotify", "ptt", "bahamut", "film", "music", "game", "heart", "star"] as const;

const id = z.string().min(1).max(60);
const title = z.string().trim().min(1).max(40);
const shortcutSchema = z.object({
  id,
  title,
  url: z.string().refine((value) => Boolean(parseWebUrl(value))),
  icon: z.enum(shortcutIcons),
});
const widgetSchema = z.object({
  id,
  type: z.enum(widgetTypes),
  title,
  url: z.string().max(2048),
  queue: z.array(z.object({ url: z.string().max(2048), title: z.string().min(1).max(200) })).max(30).optional(),
  shuffle: z.boolean().optional(),
  loop: z.boolean().optional(),
  width: z.union([z.literal(1), z.literal(2), z.literal(3)]),
}).refine((widget) =>
  widget.type === "ptt" ? widget.url === widgetCatalog.ptt.url : Boolean(resolveEmbed(widget.type, widget.url, "localhost")) && (widget.queue ?? []).every((item) => Boolean(resolveEmbed(widget.type as Exclude<WidgetType, "ptt">, item.url, "localhost"))),
);

const settingsSchema = z.object({
  version: z.literal(1),
  theme: z.enum(themes.map(({ id: themeId }) => themeId)),
  mode: z.enum(["light", "dark"]),
  shortcuts: z.array(shortcutSchema).max(MAX_SHORTCUTS),
  widgets: z.array(widgetSchema).max(MAX_WIDGETS),
}).refine(({ shortcuts, widgets }) =>
  [shortcuts, widgets].every((items) => new Set(items.map((item) => item.id)).size === items.length),
);

export type Settings = z.infer<typeof settingsSchema>;
export type Shortcut = Settings["shortcuts"][number];
export type Widget = Settings["widgets"][number];

export function defaultWidget(type: WidgetType, id: string = type): Widget {
  return { id, type, title: widgetCatalog[type].sample, url: widgetCatalog[type].url, width: 1 };
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    theme: "peach",
    mode: "light",
    shortcuts: [
      { id: "youtube", title: "YouTube", url: "https://www.youtube.com/", icon: "youtube" },
      { id: "twitch", title: "Twitch", url: "https://www.twitch.tv/", icon: "twitch" },
      { id: "spotify", title: "Spotify", url: "https://open.spotify.com/", icon: "spotify" },
      { id: "ptt", title: "PTT", url: widgetCatalog.ptt.url, icon: "ptt" },
      { id: "bahamut", title: "巴哈姆特", url: "https://www.gamer.com.tw/", icon: "bahamut" },
      { id: "anime", title: "動畫瘋", url: "https://ani.gamer.com.tw/", icon: "film" },
    ],
    widgets: [defaultWidget("youtube"), defaultWidget("twitch"), defaultWidget("spotify")],
  };
}

export function readSettings(raw: string | null): Settings {
  if (raw) {
    try {
      const result = settingsSchema.safeParse(JSON.parse(raw));
      if (result.success) {
        const widgets = result.data.widgets.map((widget) =>
          widget.type === "youtube" && widget.title === "lofi hip hop radio" &&
          widget.url === "https://www.youtube.com/watch?v=jfKfPfyJRdk"
            ? { ...widget, title: widgetCatalog.youtube.sample, url: widgetCatalog.youtube.url }
            : widget,
        );
        return { ...result.data, widgets };
      }
    } catch {
      // A malformed saved layout can be replaced with a fresh copy.
    }
  }

  return defaultSettings();
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const updated = [...items];
  const [item] = updated.splice(from, 1);
  updated.splice(to, 0, item);
  return updated;
}
