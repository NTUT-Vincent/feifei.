import type { MediaProvider } from "./catalog.ts";
import { parseWebUrl } from "./urls.ts";

export type Embed = { iframeUrl: string; externalUrl: string };
const youtubeVideo = /^[\w-]{11}$/;
const youtubePlaylist = /^[\w-]{10,100}$/;
const twitchChannel = /^[\da-z_]{1,25}$/i;
const twitchClip = /^[\da-z_-]{1,100}$/i;
const spotifyId = /^[\da-z]{22}$/i;

function youtube(url: URL): Embed | null {
  const host = url.hostname;
  const [first, second] = url.pathname.split("/").filter(Boolean);
  const short = host === "youtu.be";
  if (!short && !["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    return null;
  }
  const video = short ? first : ["shorts", "live", "embed"].includes(first) ? second : url.searchParams.get("v");
  const playlist = short || !["watch", "playlist", "embed"].includes(first) ? null : url.searchParams.get("list");

  if (playlist && youtubePlaylist.test(playlist)) {
    return {
      iframeUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${playlist}`,
      externalUrl: `https://www.youtube.com/playlist?list=${playlist}`,
    };
  }
  if (!video || !youtubeVideo.test(video)) return null;

  return {
    iframeUrl: `https://www.youtube-nocookie.com/embed/${video}`,
    externalUrl: `https://www.youtube.com/watch?v=${video}`,
  };
}

function twitch(url: URL, parent: string): Embed | null {
  const [first, second, third, extra] = url.pathname.split("/").filter(Boolean);
  const query = new URLSearchParams({ parent, autoplay: "false" });
  const clipHost = url.hostname === "clips.twitch.tv";
  if (!clipHost && !["twitch.tv", "www.twitch.tv", "m.twitch.tv"].includes(url.hostname)) return null;

  const clip = clipHost && !second ? first : second === "clip" && !extra ? third : null;
  if (clip && twitchClip.test(clip)) {
    query.set("clip", clip);
    return {
      iframeUrl: `https://clips.twitch.tv/embed?${query}`,
      externalUrl: `https://clips.twitch.tv/${clip}`,
    };
  }
  if (clipHost) return null;
  if (first === "videos" && /^\d{1,20}$/.test(second ?? "") && !third) {
    query.set("video", `v${second}`);
    return {
      iframeUrl: `https://player.twitch.tv/?${query}`,
      externalUrl: `https://www.twitch.tv/videos/${second}`,
    };
  }
  if (!first || second || !twitchChannel.test(first) || ["directory", "downloads", "settings", "subscriptions", "videos", "search", "inventory"].includes(first.toLowerCase())) {
    return null;
  }

  query.set("channel", first.toLowerCase());
  return {
    iframeUrl: `https://player.twitch.tv/?${query}`,
    externalUrl: `https://www.twitch.tv/${first.toLowerCase()}`,
  };
}

function spotify(url: URL): Embed | null {
  if (url.hostname !== "open.spotify.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0]?.startsWith("intl-")) parts.shift();
  if (parts[0] === "embed") parts.shift();
  const [kind, id, extra] = parts;
  if (!["track", "album", "artist", "playlist", "episode", "show"].includes(kind) || !spotifyId.test(id ?? "") || extra) {
    return null;
  }

  return {
    iframeUrl: `https://open.spotify.com/embed/${kind}/${id}`,
    externalUrl: `https://open.spotify.com/${kind}/${id}`,
  };
}

export function resolveEmbed(provider: MediaProvider, input: string, parent: string): Embed | null {
  const url = parseWebUrl(input);
  if (!url || url.port) return null;

  switch (provider) {
    case "youtube":
      return youtube(url);
    case "twitch":
      return twitch(url, parent);
    case "spotify":
      return spotify(url);
  }
}
