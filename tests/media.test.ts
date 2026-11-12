import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, youtubeSource, validMedia } from '../lib/media.ts';
import { defaultSettings, readSettings } from '../lib/settings.ts';
test('queue boundaries, repeat and shuffle never select the current item', () => {
  assert.equal(nextIndex(0, 0, false, true), null);
  assert.equal(nextIndex(-1, 3, false, false), 0);
  assert.equal(nextIndex(2, 3, false, false), null);
  assert.equal(nextIndex(2, 3, false, true), 0);
  for (let i = 0; i < 30; i++) assert.notEqual(nextIndex(1, 3, true, false), 1);
});
test('YouTube timestamps, playlists and provider validation', () => {
  assert.equal(youtubeSource('https://youtu.be/jfKfPfyJRdk?t=1h2m3s')?.start, 3723);
  assert.equal(youtubeSource('https://youtube.com/watch?v=jfKfPfyJRdk&start=90')?.start, 90);
  assert.equal(youtubeSource('https://youtube.com/playlist?list=PL1234567890')?.list, 'PL1234567890');
  assert.equal(validMedia('twitch', 'https://twitch.tv.evil.com/name'), false);
});
test('legacy settings and queue preferences round trip safely', () => {
  const settings = defaultSettings();
  assert.deepEqual(readSettings(JSON.stringify(settings)), settings);
  settings.widgets[0].queue = [{ url: 'https://youtu.be/jfKfPfyJRdk', title: 'Music' }];
  settings.widgets[0].shuffle = true;
  settings.widgets[0].loop = true;
  assert.deepEqual(readSettings(JSON.stringify(settings)), settings);
  settings.widgets[0].queue[0].url = 'javascript:alert(1)';
  assert.deepEqual(readSettings(JSON.stringify(settings)), defaultSettings());
});
