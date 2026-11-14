import { isProvider } from '../../../../lib/auth/security';
import { enabled } from '../../../../lib/auth/providers';
import { accountRequest } from '../../../../lib/auth/accounts';
import { session, rateLimit, AuthError, errorResponse } from '../../../../lib/auth/session';
import { libraryPath, normalizeLibrary } from '../../../../lib/media-library';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams, provider = params.get('provider') ?? '';
    if (!isProvider(provider)) throw new AuthError(400, '不支援的平台。');
    if (!enabled(provider)) throw new AuthError(503, '此平台帳號連結尚未開放。');
    const id = await session();
    if (!id) throw new AuthError(401, '請先連結帳號。');
    await rateLimit(`library:${id}`, 60);
    let query;
    try { query = libraryPath(provider, params); } catch { throw new AuthError(400, '無效的內容來源或分頁。'); }
    const data = await accountRequest(id, provider, query.path);
    if (query.source === 'channel') {
      const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (typeof uploads !== 'string' || !/^[\w-]{10,100}$/.test(uploads)) throw new AuthError(404, '此頻道沒有可用影片清單。');
      return Response.json({ collection: uploads }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const result = normalizeLibrary(provider, query.source, data);
    if (provider === 'twitch' && query.source === 'following' && result.items.length) {
      const live = await accountRequest(id, provider, `streams?${result.items.map((item) => `user_id=${encodeURIComponent(item.id)}`).join('&')}`);
      const ids = new Set((live.data ?? []).map((item: { user_id: string }) => item.user_id));
      result.items = result.items.map((item) => ({ ...item, detail: ids.has(item.id) ? '直播中' : '目前離線' })).sort((a, b) => Number(b.detail === '直播中') - Number(a.detail === '直播中'));
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
