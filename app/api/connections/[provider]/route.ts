import { and, eq } from 'drizzle-orm';
import { database } from '../../../../lib/db/index';
import { connectedAccounts, oauthStates } from '../../../../lib/db/schema';
import { isProvider, sameOrigin, unseal } from '../../../../lib/auth/security';
import { revoke } from '../../../../lib/auth/providers';
import { session, errorResponse, AuthError, rateLimit } from '../../../../lib/auth/session';
import { accountWhere, lockAccount } from '../../../../lib/auth/accounts';
export const runtime = 'nodejs';
export async function DELETE(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    if (!sameOrigin(request)) throw new AuthError(403, '請從 Feifei 解除連結。');
    const { provider } = await context.params;
    if (!isProvider(provider)) throw new AuthError(400, '不支援的平台。');
    const id = await session();
    if (!id) return Response.json({ disconnected: true });
    await rateLimit(`disconnect:${id}`, 10);
    const removed = await database().transaction(async (tx) => {
      await lockAccount(tx, id, provider);
      await tx.delete(oauthStates).where(and(eq(oauthStates.sessionId, id), eq(oauthStates.provider, provider)));
      return tx.delete(connectedAccounts).where(accountWhere(id, provider)).returning();
    });
    let revoked = false;
    if (removed[0]) { try { revoked = await revoke(provider, unseal(removed[0].refreshToken && provider === 'youtube' ? removed[0].refreshToken : removed[0].accessToken, `${id}:${provider}`)); } catch { /* Local credentials are already deleted. */ } }
    return Response.json({ disconnected: true, revoked }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
