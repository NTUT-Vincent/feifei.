import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
let client: ReturnType<typeof postgres> | undefined;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable');
  client ??= postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return drizzle(client);
}
