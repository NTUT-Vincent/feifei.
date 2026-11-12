import { resolveEmbed } from './embeds.ts';
import type { MediaProvider } from './catalog.ts';
export type MediaItem = { url: string; title: string };
export function validMedia(provider: MediaProvider, url: string) { return Boolean(resolveEmbed(provider, url, 'localhost')); }
export function nextIndex(current: number, length: number, shuffle: boolean, loop: boolean): number | null {
  if (!length) return null;
  if (shuffle && length > 1) return (current + 1 + Math.floor(Math.random() * (length - 1))) % length;
  return current + 1 < length ? current + 1 : loop ? 0 : null;
}
export function youtubeSource(url: string) {
  const embed = resolveEmbed('youtube', url, 'localhost');
  if (!embed) return null;
  const parsed = new URL(embed.iframeUrl), raw = new URL(url);
  const time = raw.searchParams.get('t') ?? raw.searchParams.get('start') ?? '0';
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
  const start = /^\d+$/.test(time) ? Number(time) : match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
  return { videoId: parsed.pathname.split('/').pop()!, list: parsed.searchParams.get('list'), start: Math.min(start, 604800) };
}
