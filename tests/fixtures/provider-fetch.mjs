// Loaded ONLY by the isolated integration-test subprocess, never by application code.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams();
  const json = (data, status = 200) => Promise.resolve(Response.json(data, { status }));
  if (/^https:\/\/(oauth2.googleapis.com\/token|id.twitch.tv\/oauth2\/token|accounts.spotify.com\/api\/token)/.test(url)) {
    if (body.get('code') === 'reject') return json({ error: 'invalid_grant' }, 400);
    return json({ access_token: body.get('grant_type') === 'refresh_token' ? 'refreshed-token' : 'test-access-token', refresh_token: 'rotated-refresh-token', expires_in: 3600 });
  }
  if (url === 'https://id.twitch.tv/oauth2/validate') return json({ client_id: 'test-client', user_id: 'test-user' });
  if (url.startsWith('https://oauth2.googleapis.com/revoke') || url.startsWith('https://id.twitch.tv/oauth2/revoke')) return new Response(null, { status: 200 });
  if (url.startsWith('https://www.googleapis.com/youtube/v3/channels')) return json({ items: [{ id: 'test-user', snippet: { title: 'YouTube Test' } }] });
  if (url.startsWith('https://api.twitch.tv/helix/users')) return json({ data: [{ id: 'test-user', display_name: 'Twitch Test' }] });
  if (url === 'https://api.spotify.com/v1/me') return json({ id: 'test-user', display_name: 'Spotify Test' });
  if (url.startsWith('https://www.googleapis.com/youtube/v3/playlists')) {
    if (url.includes('pageToken=forbidden')) return json({}, 403);
    if (url.includes('pageToken=limited')) return json({}, 429);
    if (url.includes('pageToken=unauthorized')) return json({}, 401);
    return json({ items: [{ id: 'PL111111111111', snippet: { title: 'Test playlist' } }] });
  }
  if (url.startsWith('https://api.twitch.tv/helix/streams/followed')) return json({ data: [{ user_id: '1', user_login: 'test', user_name: 'Test' }] });
  if (url.startsWith('https://api.spotify.com/v1/me/playlists')) return json({ items: [{ id: '123', name: 'Test playlist' }], next: null });
  return originalFetch(input, init);
};
