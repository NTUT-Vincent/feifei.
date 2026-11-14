import { z } from 'zod';
import type { Provider } from './auth/security.ts';
export type LibraryItem = { id: string; title: string; url?: string; detail?: string; collection?: string; channel?: string };
export type LibraryPage = { items: LibraryItem[]; nextCursor: string | null };
const text = z.string().default('');
const youtubeItem = z.object({ id: text, snippet: z.object({ title: text, resourceId: z.object({ channelId: text }).optional() }).passthrough(), contentDetails: z.object({ videoId: text }).optional() });
export function normalizeLibrary(provider: Provider, source: string, payload: unknown): LibraryPage {
  if (provider === 'youtube') {
    const data = z.object({ items: z.array(youtubeItem).default([]), nextPageToken: z.string().optional() }).parse(payload);
    return { nextCursor: data.nextPageToken ?? null, items: data.items.flatMap((item): LibraryItem[] => {
      if (source === 'subscriptions') return item.snippet.resourceId?.channelId ? [{ id: item.id, title: item.snippet.title, channel: item.snippet.resourceId.channelId }] : [];
      if (source === 'videos') return item.contentDetails?.videoId ? [{ id: item.id, title: item.snippet.title, url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}` }] : [];
      return [{ id: item.id, title: item.snippet.title, url: `https://www.youtube.com/playlist?list=${item.id}`, collection: item.id }];
    }) };
  }
  if (provider === 'twitch') {
    const data = z.object({ data: z.array(z.object({ broadcaster_id: z.string().optional(), broadcaster_login: z.string().optional(), broadcaster_name: z.string().optional(), user_id: z.string().optional(), user_login: z.string().optional(), user_name: z.string().optional(), title: z.string().optional() })).default([]), pagination: z.object({ cursor: z.string().optional() }).optional() }).parse(payload);
    return { nextCursor: data.pagination?.cursor ?? null, items: data.data.map((item) => ({ id: item.user_id ?? item.broadcaster_id!, title: item.user_name ?? item.broadcaster_name!, url: `https://www.twitch.tv/${item.user_login ?? item.broadcaster_login}`, detail: source === 'live' ? `直播中 · ${item.title ?? ''}` : '追隨中' })) };
  }
  const data = z.object({ items: z.array(z.object({ id: z.string(), name: z.string() }).nullable()).default([]), next: z.string().nullable().optional(), offset: z.number().default(0), limit: z.number().default(20) }).parse(payload);
  return { nextCursor: data.next ? String(data.offset + data.limit) : null, items: data.items.flatMap((item) => item ? [{ id: item.id, title: item.name, url: `https://open.spotify.com/playlist/${item.id}` }] : []) };
}
export function libraryPath(provider: Provider, params: URLSearchParams) {
  const source = params.get('source') ?? (provider === 'twitch' ? 'live' : 'playlists');
  const cursor = params.get('cursor') ?? '';
  if (cursor.length > 512 || !/^[\w=+/-]*$/.test(cursor)) throw new Error('Invalid cursor');
  if (provider === 'youtube') {
    const query = new URLSearchParams({ part: source === 'videos' ? 'snippet,contentDetails' : 'snippet', maxResults: '20' });
    if (cursor) query.set('pageToken', cursor);
    if (source === 'videos') {
      const playlist = params.get('collection') ?? '';
      if (!/^[\w-]{10,100}$/.test(playlist)) throw new Error('Invalid playlist');
      query.set('playlistId', playlist);
    } else if (source === 'playlists' || source === 'subscriptions') query.set('mine', 'true');
    else if (source === 'channel') {
      const channel = params.get('channel') ?? '';
      if (!/^UC[\w-]{22}$/.test(channel)) throw new Error('Invalid channel');
      return { source: 'channel', path: `channels?part=contentDetails&id=${channel}` };
    } else throw new Error('Invalid source');
    return { source, path: `${source === 'videos' ? 'playlistItems' : source}?${query}` };
  }
  if (provider === 'twitch') {
    if (!['live', 'following'].includes(source)) throw new Error('Invalid source');
    return { source, path: `${source === 'live' ? 'streams' : 'channels'}/followed?user_id={user}&first=20${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}` };
  }
  if (source !== 'playlists' || (cursor && !/^\d{1,6}$/.test(cursor))) throw new Error('Invalid source');
  return { source, path: `me/playlists?limit=20&offset=${cursor || '0'}` };
}
