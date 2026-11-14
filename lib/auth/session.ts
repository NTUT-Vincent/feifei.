import { cookies } from 'next/headers';
import { and, eq, gt, sql } from 'drizzle-orm';
import { database } from '../db/index.ts';
import { guestSessions, requestBudgets } from '../db/schema.ts';
import { baseUrl, randomSecret, sessionHash } from './security.ts';
export const cookieName = 'feifei.session';
export const sessionSeconds = 30 * 86400;
export async function session(create = false) {
  const jar = await cookies(), value = jar.get(cookieName)?.value;
  const db = database();
  if (value && /^[\w-]{43}$/.test(value)) {
    const id = sessionHash(value);
    const [found] = await db.select().from(guestSessions).where(and(eq(guestSessions.id, id), gt(guestSessions.expiresAt, new Date())));
    if (found) return id;
  }
  if (!create) return null;
  const raw = randomSecret(), id = sessionHash(raw);
  await db.insert(guestSessions).values({ id, expiresAt: new Date(Date.now() + sessionSeconds * 1000) });
  jar.set(cookieName, raw, { httpOnly: true, secure: new URL(baseUrl()).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: sessionSeconds });
  return id;
}
export async function rateLimit(key: string, max: number, seconds = 60) {
  const db = database();
  const [row] = await db.insert(requestBudgets).values({ key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) }).onConflictDoUpdate({
    target: requestBudgets.key,
    set: { count: sql`case when ${requestBudgets.expiresAt} < now() then 1 else ${requestBudgets.count} + 1 end`, expiresAt: sql`case when ${requestBudgets.expiresAt} < now() then now() + ${seconds} * interval '1 second' else ${requestBudgets.expiresAt} end` },
  }).returning();
  if (row.count > max) throw new AuthError(429, '操作太頻繁，請稍後再試。');
}
export class AuthError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof AuthError ? error.message : '帳號服務暫時無法使用，請稍後再試。' }, { status: error instanceof AuthError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
