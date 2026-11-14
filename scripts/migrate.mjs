import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (process.env.VERCEL_ENV === 'production') throw new Error('DATABASE_URL is required for production');
  console.log('Database migration skipped: no database configured.');
} else {
  const client = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    await client`select pg_advisory_lock(642739012)`;
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    await client`delete from guest_sessions where expires_at < now()`;
    await client`delete from oauth_states where expires_at < now()`;
    await client`delete from request_budgets where expires_at < now()`;
    console.log('Database migrations and expired-data cleanup completed.');
  } finally { await client.end(); }
}
