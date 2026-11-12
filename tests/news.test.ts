import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectNews, newsSources, parseNewsFeed } from '../lib/news-feeds.ts';
import { mixNews, type NewsItem } from '../lib/news.ts';

const now = Date.parse('2026-11-12T08:00:00Z');
const source = newsSources[0];
const xml = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;
const entry = (title: string, link = 'https://www.4gamers.com.tw/news/1', date = 'Thu, 12 Nov 2026 07:00:00 GMT') => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate></item>`;

test('RSS extracts plain titles, classifies anime and removes tracking', async () => {
  const items = await parseNewsFeed(xml(entry('<b>動畫新番</b>', 'https://www.4gamers.com.tw/news/1?utm_source=feed&amp;id=1#top')), source, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, '動畫新番');
  assert.equal(items[0].category, 'anime');
  assert.equal(items[0].url, 'https://www.4gamers.com.tw/news/1?id=1');
});

test('RSS rejects unsafe links, unrelated hosts, gossip, adult titles and bad dates', async () => {
  const entries = [entry('新遊戲', 'javascript:alert(1)'), entry('新遊戲', 'https://4gamers.com.tw.evil.test/a'), entry('新遊戲', 'https://a:b@www.4gamers.com.tw/a'), entry('藝人戀情'), entry('成人遊戲拔作'), entry('太舊', undefined, 'Thu, 01 Oct 2026 07:00:00 GMT'), entry('未來', undefined, 'Thu, 12 Nov 2026 10:00:00 GMT'), entry('沒日期', undefined, 'invalid')];
  assert.deepEqual(await parseNewsFeed(xml(entries.join('')), source, now), []);
});

test('RSS fails closed on malformed XML, empty feeds, entities and oversized bodies', async () => {
  for (const content of ['<rss><broken>', xml(''), '<!DOCTYPE rss>' + xml(entry('test')), 'x'.repeat(2_000_001)]) {
    await assert.rejects(parseNewsFeed(content, source, now));
  }
});

const item = (id: string, category: NewsItem['category']): NewsItem => ({ id, title: id, url: `https://example.com/${id}`, source: 'Test', category, publishedAt: '2026-11-12T07:00:00.000Z' });
test('mixed wall deduplicates URLs and normalized titles while balancing categories', () => {
  const entries = [item('a', 'games'), item('b', 'games'), item('c', 'games'), item('d', 'music'), item('e', 'anime'), item('f', 'memes')];
  const result = mixNews([...entries, entries[0], { ...item('other', 'music'), title: ' A ' }]);
  assert.equal(result.length, 6);
  assert.deepEqual(result.slice(0, 4).map((entry) => entry.category), ['anime', 'music', 'memes', 'games']);
});

test('one failed feed does not discard other sources; total failure is explicit', async () => {
  const partial = await collectNews(async (feed) => { if (feed.name === source.name) throw new Error('timeout'); return [item(feed.name, feed.category)]; });
  assert.equal(partial.items.length, 4);
  assert.deepEqual(partial.unavailableSources, ['4Gamers']);
  const failed = await collectNews(async () => { throw new Error('unavailable'); });
  assert.equal(failed.items.length, 0);
  assert.equal(failed.unavailableSources.length, newsSources.length);
});
