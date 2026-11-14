import test from 'node:test';
import assert from 'node:assert/strict';
import { seal, unseal, hash, randomSecret, sessionHash, sameOrigin, baseUrl } from '../lib/auth/security.ts';
import { libraryPath, normalizeLibrary } from '../lib/media-library.ts';
process.env.TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);
process.env.SESSION_SECRET = 'test-only-session-secret-'.repeat(3);
process.env.APP_BASE_URL = 'https://feifei.example';
test('encrypted tokens are random, authenticated, and bound to session/provider', () => {
  const encrypted = seal('private-token', 'user-a:youtube');
  assert.notEqual(encrypted, seal('private-token', 'user-a:youtube'));
  assert.equal(unseal(encrypted, 'user-a:youtube'), 'private-token');
  assert.throws(() => unseal(encrypted, 'user-b:youtube'));
  assert.throws(() => unseal(encrypted, 'user-a:twitch'));
  const tampered = Buffer.from(encrypted, 'base64url'); tampered[30] ^= 1;
  assert.throws(() => unseal(tampered.toString('base64url'), 'user-a:youtube'));
});
test('opaque session and state values have sufficient entropy; only hashes are stored', () => {
  const a = randomSecret(), b = randomSecret();
  assert.match(a, /^[\w-]{43}$/); assert.notEqual(a, b);
  assert.notEqual(hash(a), a); assert.equal(sessionHash(a), sessionHash(a)); assert.notEqual(sessionHash(a), sessionHash(b));
});
test('mutation requests require exact origin and custom header', () => {
  const request = (origin: string, header = '1') => new Request('https://feifei.example/api/connections', { headers: { origin, 'x-feifei-request': header } });
  assert.equal(sameOrigin(request('https://feifei.example')), true);
  assert.equal(sameOrigin(request('https://evil.example')), false);
  assert.equal(sameOrigin(request('https://feifei.example', '')), false);
  assert.equal(baseUrl(), 'https://feifei.example');
});
test('library requests never accept arbitrary upstream URLs or malformed pagination', () => {
  assert.throws(() => libraryPath('youtube', new URLSearchParams({ source: 'videos', collection: 'https://evil.test' })));
  assert.throws(() => libraryPath('spotify', new URLSearchParams({ cursor: 'https://evil.test' })));
  assert.throws(() => libraryPath('twitch', new URLSearchParams({ source: 'users' })));
  assert.equal(libraryPath('spotify', new URLSearchParams({ cursor: '20' })).path, 'me/playlists?limit=20&offset=20');
});
test('YouTube subscriptions, playlists and videos normalize separately', () => {
  assert.deepEqual(normalizeLibrary('youtube', 'subscriptions', { items: [{ id: 's1', snippet: { title: '頻道', resourceId: { channelId: 'UC123' } } }] }).items, [{ id: 's1', title: '頻道', channel: 'UC123' }]);
  assert.equal(normalizeLibrary('youtube', 'playlists', { items: [{ id: 'PL123', snippet: { title: '歌單' } }], nextPageToken: 'next' }).nextCursor, 'next');
  assert.equal(normalizeLibrary('youtube', 'videos', { items: [{ id: 'v1', snippet: { title: '音樂' }, contentDetails: { videoId: 'abcdefghijk' } }] }).items[0].url, 'https://www.youtube.com/watch?v=abcdefghijk');
});
test('Spotify null entries and Twitch followed streams normalize safely', () => {
  assert.deepEqual(normalizeLibrary('spotify', 'playlists', { items: [null, { id: 'p1', name: '清單' }], next: 'ignored-external-url', offset: 0, limit: 20 }).nextCursor, '20');
  const result = normalizeLibrary('twitch', 'live', { data: [{ user_id: '1', user_name: 'Stream', user_login: 'stream', title: '遊戲' }], pagination: { cursor: 'next' } });
  assert.equal(result.items[0].url, 'https://www.twitch.tv/stream'); assert.equal(result.nextCursor, 'next');
});
