import { and, eq, sql } from 'drizzle-orm';
import { database } from '../db/index.ts';
import { connectedAccounts } from '../db/schema.ts';
import { seal, unseal, type Provider } from './security.ts';
import { configuration, exchange, providerFetch } from './providers.ts';
import { AuthError } from './session.ts';
export const accountWhere = (id: string, provider: Provider) => and(eq(connectedAccounts.sessionId, id), eq(connectedAccounts.provider, provider));
// A transaction row lock serializes refresh-token rotation across serverless instances.
export async function accessToken(id: string, provider: Provider, rejectedToken?: string) {
  return database().transaction(async (tx) => {
    const [row] = await tx.select().from(connectedAccounts).where(accountWhere(id, provider)).for('update');
    if (!row) throw new AuthError(401, '請先連結帳號。');
    const context = `${id}:${provider}`, current = unseal(row.accessToken, context);
    if (row.expiresAt.getTime() > Date.now() + 60000 && (!rejectedToken || current !== rejectedToken)) return { token: current, userId: row.userId };
    if (!row.refreshToken) throw new AuthError(401, '授權已過期，請重新連結帳號。');
    const token = await exchange(provider, { grant_type: 'refresh_token', refresh_token: unseal(row.refreshToken, context) });
    await tx.update(connectedAccounts).set({ accessToken: seal(token.access_token, context), refreshToken: token.refresh_token ? seal(token.refresh_token, context) : row.refreshToken, expiresAt: new Date(Date.now() + token.expires_in * 1000), updatedAt: new Date() }).where(accountWhere(id, provider));
    return { token: token.access_token, userId: row.userId };
  });
}
export async function accountRequest(id: string, provider: Provider, path: string) {
  let access = await accessToken(id, provider);
  if (provider === 'twitch') {
    const validation = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${access.token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (validation.status === 401) access = await accessToken(id, provider, access.token);
    else if (!validation.ok) throw new AuthError(502, 'Twitch 暫時無法驗證授權。');
    else {
      const identity = await validation.json();
      if (identity.client_id !== configuration(provider).clientId || identity.user_id !== access.userId) throw new AuthError(401, '請重新連結 Twitch。');
    }
  }
  let response = await providerFetch(provider, access.token, path.replace('{user}', encodeURIComponent(access.userId)));
  if (response.status === 401) {
    access = await accessToken(id, provider, access.token);
    response = await providerFetch(provider, access.token, path.replace('{user}', encodeURIComponent(access.userId)));
  }
  if (!response.ok) throw new AuthError([401, 403, 429].includes(response.status) ? response.status : 502, response.status === 429 ? '平台請求次數已達限制，請稍後再試。' : response.status === 403 ? '權限不足或平台尚未開放此帳號，請確認授權設定。' : '無法讀取內容，請稍後再試或重新連結。');
  return response.json();
}
// Avoid resurrecting credentials after a concurrent disconnect/callback.
export async function lockAccount(tx: Parameters<Parameters<ReturnType<typeof database>['transaction']>[0]>[0], id: string, provider: Provider) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id + ':' + provider}))`);
}
