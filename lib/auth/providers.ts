import { z } from 'zod';
import { baseUrl, hash, type Provider } from './security.ts';
import { AuthError } from './session.ts';
const definitions = {
  youtube: { env: 'GOOGLE', authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'https://www.googleapis.com/auth/youtube.readonly' },
  twitch: { env: 'TWITCH', authorize: 'https://id.twitch.tv/oauth2/authorize', token: 'https://id.twitch.tv/oauth2/token', scope: 'user:read:follows' },
  spotify: { env: 'SPOTIFY', authorize: 'https://accounts.spotify.com/authorize', token: 'https://accounts.spotify.com/api/token', scope: 'playlist-read-private playlist-read-collaborative' },
};
export function configuration(provider: Provider) {
  const def = definitions[provider];
  return { ...def, clientId: process.env[`${def.env}_CLIENT_ID`] ?? '', clientSecret: process.env[`${def.env}_CLIENT_SECRET`] ?? '', redirect: `${baseUrl()}/api/connections/${provider}/callback` };
}
export function enabled(provider: Provider) {
  const cfg = configuration(provider);
  return Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET && process.env.TOKEN_ENCRYPTION_KEY && cfg.clientId && cfg.clientSecret && (provider !== 'spotify' || process.env.SPOTIFY_OAUTH_ENABLED === 'true'));
}
export function authorizationUrl(provider: Provider, state: string, verifier: string) {
  const cfg = configuration(provider), url = new URL(cfg.authorize);
  url.search = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirect, response_type: 'code', scope: cfg.scope, state }).toString();
  if (provider !== 'twitch') { url.searchParams.set('code_challenge', hash(verifier)); url.searchParams.set('code_challenge_method', 'S256'); }
  if (provider === 'youtube') { url.searchParams.set('access_type', 'offline'); url.searchParams.set('prompt', 'consent'); }
  if (provider === 'twitch') url.searchParams.set('force_verify', 'true');
  return url;
}
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().optional(), expires_in: z.number().positive(), scope: z.union([z.string(), z.array(z.string())]).optional() });
export async function exchange(provider: Provider, values: Record<string, string>) {
  const cfg = configuration(provider);
  const body = new URLSearchParams({ client_id: cfg.clientId, ...values });
  if (provider !== 'spotify') body.set('client_secret', cfg.clientSecret);
  const response = await fetch(cfg.token, { method: 'POST', body, headers: provider === 'spotify' ? { Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}` } : {}, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new AuthError(response.status === 429 ? 429 : response.status >= 500 ? 502 : 401, '授權無法更新，請重新連結帳號。');
  return tokenSchema.parse(await response.json());
}
export async function providerFetch(provider: Provider, token: string, path: string) {
  const root = provider === 'youtube' ? 'https://www.googleapis.com/youtube/v3/' : provider === 'twitch' ? 'https://api.twitch.tv/helix/' : 'https://api.spotify.com/v1/';
  return fetch(`${root}${path}`, { headers: { Authorization: `Bearer ${token}`, ...(provider === 'twitch' ? { 'Client-Id': configuration(provider).clientId } : {}) }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
}
export async function profile(provider: Provider, token: string) {
  const response = await providerFetch(provider, token, provider === 'youtube' ? 'channels?part=snippet&mine=true' : provider === 'twitch' ? 'users' : 'me');
  if (!response.ok) throw new AuthError(403, '無法讀取帳號，請確認測試者資格與授權權限。');
  const data = await response.json();
  const user = provider === 'youtube' ? data.items?.[0] : provider === 'twitch' ? data.data?.[0] : data;
  if (!user?.id) throw new AuthError(403, '找不到可用帳號，請確認已建立 YouTube 頻道。');
  return { userId: String(user.id), displayName: String(user.snippet?.title ?? user.display_name ?? user.id) };
}
export async function revoke(provider: Provider, token: string) {
  if (provider === 'spotify') return false; // No programmatic revocation endpoint.
  const body = new URLSearchParams({ token, ...(provider === 'twitch' ? { client_id: configuration(provider).clientId } : {}) });
  try {
    const response = await fetch(provider === 'youtube' ? 'https://oauth2.googleapis.com/revoke' : 'https://id.twitch.tv/oauth2/revoke', { method: 'POST', body, signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch { return false; }
}
