import { NextRequest, NextResponse } from 'next/server';

let token: { value: string; until: number } | undefined;
let pending: Promise<string> | undefined;
let spotifyTokenCache: { value: string; until: number } | undefined;
let spotifyPending: Promise<string> | undefined;
async function spotifyToken(): Promise<string> {
  if (spotifyTokenCache && spotifyTokenCache.until > Date.now()) return spotifyTokenCache.value;
  if (spotifyPending) return spotifyPending;
  spotifyPending = (async () => {
    const credentials = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }), cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`spotify_auth_${response.status}`);
    const data = await response.json();
    spotifyTokenCache = { value: data.access_token, until: Date.now() + Math.max(0, data.expires_in - 120) * 1000 };
    return data.access_token as string;
  })().finally(() => { spotifyPending = undefined; });
  return spotifyPending;
}

const cache = new Map<string, { until: number; items: unknown[] }>();
// Instance-local guard complements the provider quota; configure a shared edge rate limit for larger deployments.
let budget = { start: Date.now(), count: 0 };
async function twitchToken(): Promise<string> {
  if (token && token.until > Date.now()) return token.value;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID!, client_secret: process.env.TWITCH_CLIENT_SECRET!, grant_type: 'client_credentials' }),
    });
    if (!response.ok) throw new Error(`twitch_auth_${response.status}`);
    const data = await response.json();
    token = { value: data.access_token, until: Date.now() + Math.max(0, data.expires_in - 120) * 1000 };
    return token.value;
  })().finally(() => { pending = undefined; });
  return pending;
}
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!['youtube', 'twitch', 'spotify'].includes(provider ?? '') || !q || q.length > 100) return NextResponse.json({ error: '請輸入 1–100 字的搜尋內容。' }, { status: 400 });
  if (provider === 'youtube' ? !process.env.YOUTUBE_API_KEY : provider === 'twitch' ? !process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET : !process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return NextResponse.json({ error: '搜尋尚未開通，可以先貼上網址播放。' }, { status: 503 });
  const key = `${provider}:${q.toLowerCase()}`;
  const saved = cache.get(key);
  if (saved && saved.until > Date.now()) return NextResponse.json({ items: saved.items });
  if (Date.now() - budget.start > 3600000) budget = { start: Date.now(), count: 0 };
  if (++budget.count > 60) return NextResponse.json({ error: '搜尋次數較多，請稍後再試，或直接貼上網址。' }, { status: 429 });
  try {
    let items: { url: string; title: string; detail: string }[];
    if (provider === 'youtube') {
      const params = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '8', q, key: process.env.YOUTUBE_API_KEY! });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`provider_${response.status}`);
      const data = await response.json();
      items = (data.items ?? []).map((item: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }) => ({ url: `https://www.youtube.com/watch?v=${item.id.videoId}`, title: item.snippet.title, detail: item.snippet.channelTitle }));
    } else if (provider === 'spotify') {
      const search = async () => fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track,album,playlist', limit: '8', market: 'TW' })}`, { headers: { Authorization: `Bearer ${await spotifyToken()}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
      let response = await search();
      if (response.status === 401) { spotifyTokenCache = undefined; response = await search(); }
      if (!response.ok) throw new Error(`provider_${response.status}`);
      const data = await response.json();
      items = [
        ...(data.tracks?.items ?? []).filter((item: any) => item?.id).map((item: any) => ({ url: `https://open.spotify.com/track/${item.id}`, title: String(item.name), detail: `歌曲 · ${(item.artists ?? []).map((a: any) => a.name).join(', ')}` })),
        ...(data.albums?.items ?? []).filter((item: any) => item?.id).map((item: any) => ({ url: `https://open.spotify.com/album/${item.id}`, title: String(item.name), detail: `專輯 · ${(item.artists ?? []).map((a: any) => a.name).join(', ')}` })),
        ...(data.playlists?.items ?? []).filter((item: any) => item?.id).map((item: any) => ({ url: `https://open.spotify.com/playlist/${item.id}`, title: String(item.name), detail: '播放清單' })),
      ];
    } else {
      const search = async () => fetch(`https://api.twitch.tv/helix/search/channels?${new URLSearchParams({ query: q, first: '8' })}`, { headers: { 'Client-Id': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${await twitchToken()}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
      let response = await search();
      if (response.status === 401) { token = undefined; response = await search(); }
      if (!response.ok) throw new Error(`provider_${response.status}`);
      const data = await response.json();
      items = (data.data ?? []).map((item: { broadcaster_login: string; display_name: string; is_live: boolean }) => ({ url: `https://www.twitch.tv/${item.broadcaster_login}`, title: item.display_name, detail: item.is_live ? '直播中' : '目前離線' }));
    }
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { items, until: Date.now() + 300000 });
    return NextResponse.json({ items });
  } catch (error) {
    const reason = error instanceof Error && /^(twitch_auth|spotify_auth|provider)_\d+$/.test(error.message) ? error.message : 'upstream_unavailable';
    console.warn('media-search', provider, reason);
    return NextResponse.json({ code: reason, error: '暫時無法搜尋，請稍後再試，或貼上網址播放。' }, { status: 502 });
  }
}
