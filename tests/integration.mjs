import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { unseal } from '../lib/auth/security.ts';
process.exitCode = 1;
const directory = await mkdtemp(join(tmpdir(), 'feifei-pg-'));
const pg = new EmbeddedPostgres({ databaseDir: directory, port: 55439, user: 'postgres', password: 'test-only', persistent: false, onLog() {}, onError() {} });
const env = { ...process.env, DATABASE_URL: 'postgres://postgres:test-only@localhost:55439/postgres', DATABASE_URL_UNPOOLED: '', APP_BASE_URL: 'http://localhost:3107', SESSION_SECRET: 'test-session-secret-'.repeat(3), TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32), GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret', SPOTIFY_CLIENT_ID: 'test-client', SPOTIFY_CLIENT_SECRET: 'test-secret', SPOTIFY_OAUTH_ENABLED: 'true' };
process.env.TOKEN_ENCRYPTION_KEY = env.TOKEN_ENCRYPTION_KEY;
let server, db;
const root = env.APP_BASE_URL;
const mutationHeaders = { origin: root, 'x-feifei-request': '1' };
async function start(provider, cookie) {
  const response = await fetch(`${root}/api/connections/${provider}/authorize`, { method: 'POST', headers: { ...mutationHeaders, ...(cookie ? { cookie } : {}) } });
  assert.equal(response.status, 200, await response.clone().text());
  const url = new URL((await response.json()).url);
  return { cookie: cookie ?? response.headers.get('set-cookie').split(';')[0], state: url.searchParams.get('state'), url };
}
async function callback(provider, auth, code = 'valid') {
  return fetch(`${root}/api/connections/${provider}/callback?${new URLSearchParams({ state: auth.state, code })}`, { headers: { cookie: auth.cookie }, redirect: 'manual' });
}
try {
  await pg.initialise(); await pg.start();
  for (let i = 0; i < 2; i++) {
    const migration = spawn(process.execPath, ['scripts/migrate.mjs'], { env, stdio: 'pipe' });
    assert.equal((await once(migration, 'exit'))[0], 0, 'migration must be repeatable');
  }
  db = postgres(env.DATABASE_URL, { max: 1 });
  server = spawn(process.execPath, ['--import', resolve('tests/fixtures/provider-fetch.mjs'), 'node_modules/next/dist/bin/next', 'start', '-p', '3107', '--hostname', 'localhost'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; server.stdout.on('data', (chunk) => { logs += chunk; }); server.stderr.on('data', (chunk) => { logs += chunk; });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(root)).ok) break; } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  let cookie;
  for (const provider of ['youtube', 'twitch', 'spotify']) {
    const auth = await start(provider, cookie); cookie = auth.cookie;
    assert.equal(auth.url.searchParams.get('redirect_uri'), `${root}/api/connections/${provider}/callback`);
    assert.equal(auth.url.searchParams.has('code_challenge'), provider !== 'twitch');
    assert.match((await callback(provider, auth)).headers.get('location'), /connection=success/);
    assert.match((await callback(provider, auth)).headers.get('location'), /connection=failed/, 'state replay must fail');
    const data = await fetch(`${root}/api/media/library?provider=${provider}`, { headers: { cookie } });
    assert.equal(data.status, 200, await data.clone().text());
    assert.equal((await data.json()).items.length, 1);
  }
  const status = await (await fetch(`${root}/api/connections`, { headers: { cookie } })).json();
  assert.equal(status.connections.filter((item) => item.connected).length, 3);
  assert.doesNotMatch(JSON.stringify(status), /token|secret/i);
  assert.equal((await fetch(`${root}/api/media/library?provider=youtube`)).status, 401);
  const other = await start('youtube');
  assert.match((await callback('youtube', { ...other, cookie })).headers.get('location'), /connection=failed/, 'state cannot move between sessions');
  assert.match((await callback('youtube', other)).headers.get('location'), /connection=success/);
  await db`update connected_accounts set token_expires_at = now() - interval '1 minute' where provider = 'youtube'`;
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => fetch(`${root}/api/media/library?provider=youtube`, { headers: { cookie } })));
  concurrent.forEach((response) => assert.equal(response.status, 200));
  const accounts = await db`select * from connected_accounts where provider = 'youtube'`;
  const refreshed = accounts.find((row) => unseal(row.encrypted_access_token, `${row.session_id}:youtube`) === 'refreshed-token');
  assert.ok(refreshed); assert.equal(unseal(refreshed.encrypted_refresh_token, `${refreshed.session_id}:youtube`), 'rotated-refresh-token');
  for (const [cursor, expected] of [['forbidden', 403], ['limited', 429], ['unauthorized', 401]]) {
    assert.equal((await fetch(`${root}/api/media/library?provider=youtube&cursor=${cursor}`, { headers: { cookie } })).status, expected);
  }
  const expired = await start('twitch', cookie);
  await db`update oauth_states set expires_at = now() - interval '1 minute'`;
  assert.match((await callback('twitch', expired)).headers.get('location'), /connection=failed/);
  const failed = await start('twitch', cookie);
  assert.match((await callback('twitch', failed, 'reject')).headers.get('location'), /connection=failed/);
  assert.match((await callback('twitch', failed)).headers.get('location'), /connection=failed/, 'failed exchange consumes state');
  const pending = await start('youtube', cookie);
  assert.equal((await fetch(`${root}/api/connections/youtube`, { method: 'DELETE', headers: { ...mutationHeaders, cookie } })).status, 200);
  assert.match((await callback('youtube', pending)).headers.get('location'), /connection=failed/, 'disconnect invalidates pending callbacks');
  assert.equal((await fetch(`${root}/api/media/library?provider=youtube`, { headers: { cookie } })).status, 401);
  assert.equal((await fetch(`${root}/api/media/library?provider=youtube`, { headers: { cookie: other.cookie } })).status, 200, 'other session survives disconnect');
  await db`update guest_sessions set expires_at = now() - interval '1 second'`;
  assert.equal((await fetch(`${root}/api/media/library?provider=twitch`, { headers: { cookie } })).status, 401);
  process.exitCode = 0;
  console.log('PASS: real PostgreSQL migrations; all three OAuth flows; PKCE; state replay/expiry/session binding; encrypted storage; concurrent refresh; API 401/403/429; disconnect; session expiry. Provider responses are fixtures.');
} finally {
  if (server) { server.kill(); await once(server, 'exit'); }
  if (db) await db.end();
  await pg.stop(); await rm(directory, { recursive: true, force: true });
}
