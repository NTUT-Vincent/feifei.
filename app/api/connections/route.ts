import { eq } from 'drizzle-orm';
import { database } from '../../../lib/db/index';
import { connectedAccounts } from '../../../lib/db/schema';
import { providers } from '../../../lib/auth/security';
import { enabled } from '../../../lib/auth/providers';
import { session, errorResponse } from '../../../lib/auth/session';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const id = process.env.DATABASE_URL ? await session() : null;
    const rows = id ? await database().select({ provider: connectedAccounts.provider, displayName: connectedAccounts.displayName }).from(connectedAccounts).where(eq(connectedAccounts.sessionId, id)) : [];
    return Response.json({ connections: providers.map((provider) => ({ provider, enabled: enabled(provider), connected: rows.some((r) => r.provider === provider), displayName: rows.find((r) => r.provider === provider)?.displayName ?? null })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
