import { headers } from 'next/headers';
import { database } from '../../../../../lib/db/index';
import { oauthStates } from '../../../../../lib/db/schema';
import { isProvider, hash, seal, randomSecret, sameOrigin, baseUrl } from '../../../../../lib/auth/security';
import { authorizationUrl, enabled } from '../../../../../lib/auth/providers';
import { session, rateLimit, errorResponse, AuthError } from '../../../../../lib/auth/session';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    if (!sameOrigin(request)) throw new AuthError(403, '請從 Feifei 開始連結。');
    const { provider } = await context.params;
    if (!isProvider(provider)) throw new AuthError(400, '不支援的平台。');
    if (!enabled(provider)) throw new AuthError(503, '此平台帳號連結尚未開放。');
    // Prevent a preview host from minting a session whose callback goes to production.
    if (new URL(request.url).origin !== baseUrl()) throw new AuthError(400, '請在正式網址連結帳號。');
    const h = await headers();
    await rateLimit(`authorize-ip:${hash(h.get('x-vercel-forwarded-for') ?? h.get('x-forwarded-for') ?? 'local')}`, 15, 600);
    const id = (await session(true))!;
    await rateLimit(`authorize:${id}`, 10, 600);
    const state = randomSecret(), verifier = randomSecret();
    await database().insert(oauthStates).values({ hash: hash(state), sessionId: id, provider, verifier: seal(verifier, `${id}:${provider}:state`), expiresAt: new Date(Date.now() + 600000) });
    return Response.json({ url: authorizationUrl(provider, state, verifier).toString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
