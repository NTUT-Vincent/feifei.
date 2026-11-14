import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { database } from '../../../../../lib/db/index';
import { oauthStates, connectedAccounts, guestSessions } from '../../../../../lib/db/schema';
import { isProvider, hash, seal, unseal, baseUrl } from '../../../../../lib/auth/security';
import { configuration, enabled, exchange, profile } from '../../../../../lib/auth/providers';
import { session } from '../../../../../lib/auth/session';
import { lockAccount } from '../../../../../lib/auth/accounts';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const redirect = new URL('/', baseUrl());
  try {
    const { provider } = await context.params;
    if (!isProvider(provider) || !enabled(provider)) throw new Error('provider');
    const url = new URL(request.url), state = url.searchParams.get('state');
    const id = await session();
    if (!id || !state || !/^[\w-]{43}$/.test(state)) throw new Error('state');
    await database().transaction(async (tx) => {
      await lockAccount(tx, id, provider);
      const [pending] = await tx.delete(oauthStates).where(and(eq(oauthStates.hash, hash(state)), eq(oauthStates.sessionId, id), eq(oauthStates.provider, provider), gt(oauthStates.expiresAt, new Date()))).returning();
      if (!pending) throw new Error('state');
      // Commit consumed state even when the upstream exchange fails.
      try {
        if (url.searchParams.has('error')) { redirect.searchParams.set('connection', 'cancelled'); return; }
        const code = url.searchParams.get('code');
        if (!code || code.length > 4096) throw new Error('code');
        const cfg = configuration(provider);
        const token = await exchange(provider, { grant_type: 'authorization_code', code, redirect_uri: cfg.redirect, ...(provider !== 'twitch' ? { code_verifier: unseal(pending.verifier, `${id}:${provider}:state`) } : {}) });
        const scopes = Array.isArray(token.scope) ? token.scope : token.scope?.split(' ');
        if (scopes && cfg.scope.split(' ').some((scope) => !scopes.includes(scope))) throw new Error('scope');
        const user = await profile(provider, token.access_token);
        const [active] = await tx.select().from(guestSessions).where(and(eq(guestSessions.id, id), gt(guestSessions.expiresAt, new Date())));
        if (!active) throw new Error('session');
        const values = { sessionId: id, provider, ...user, accessToken: seal(token.access_token, `${id}:${provider}`), refreshToken: token.refresh_token ? seal(token.refresh_token, `${id}:${provider}`) : null, expiresAt: new Date(Date.now() + token.expires_in * 1000), scopes: scopes?.join(' ') ?? cfg.scope, updatedAt: new Date() };
        await tx.insert(connectedAccounts).values(values).onConflictDoUpdate({ target: [connectedAccounts.sessionId, connectedAccounts.provider], set: values });
        redirect.searchParams.set('connection', 'success');
      } catch { redirect.searchParams.set('connection', 'failed'); }
    });
  } catch { redirect.searchParams.set('connection', 'failed'); }
  const response = NextResponse.redirect(redirect, 303);
  response.headers.set('Cache-Control', 'no-store'); response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
