import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectNews, newsSources, parseNewsFeed } from '../lib/news-feeds.ts';
import { mixNews, type NewsItem } from '../lib/news.ts';

const now = Date.parse('2026-11-12T08:00:00Z');
const source = newsSources.find((item) => item.name === '4Gamers')!;
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

const item = (id: string, category: NewsItem['category']): NewsItem => ({ id, title: id, url: `https://example.com/${id}`, source: 'Test', category, language: 'en', publishedAt: '2026-11-12T07:00:00.000Z' });
test('mixed wall deduplicates URLs and normalized titles while balancing categories', () => {
  const entries = [item('a', 'games'), item('b', 'games'), item('c', 'games'), item('d', 'music'), item('e', 'anime'), item('f', 'memes')];
  const result = mixNews([...entries, entries[0], { ...item('other', 'music'), title: ' A ' }]);
  assert.equal(result.length, 6);
  assert.deepEqual(result.slice(0, 4).map((entry) => entry.category), ['anime', 'music', 'memes', 'games']);
});

test('one failed feed does not discard other sources; total failure is explicit', async () => {
  const partial = await collectNews(async (feed) => { if (feed.name === source.name) throw new Error('timeout'); return [item(feed.name, feed.category)]; });
  assert.equal(partial.items.length, newsSources.length - 1);
  assert.deepEqual(partial.unavailableSources, ['4Gamers']);
  const failed = await collectNews(async () => { throw new Error('unavailable'); });
  assert.equal(failed.items.length, 0);
  assert.equal(failed.unavailableSources.length, newsSources.length);
});

test('expanded culture news sources have unique names, HTTPS feeds and expected categories', () => {
  assert.equal(newsSources.length, 13);
  assert.equal(new Set(newsSources.map((feed) => feed.name)).size, newsSources.length);
  for (const feed of newsSources) {
    const url = new URL(feed.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname === feed.host || url.hostname.endsWith(`.${feed.host}`));
    assert.ok(['zh', 'en'].includes(feed.language));
  }
  assert.equal(newsSources.find((feed) => feed.name === '巴哈姆特 GNN')?.category, 'games');
  assert.equal(newsSources.find((feed) => feed.name === 'NME Music')?.category, 'music');
});

test('new sources classify anime headlines and reject off-domain article links', async () => {
  for (const name of ['巴哈姆特 GNN']) {
    const feed = newsSources.find((item) => item.name === name)!;
    const articleUrl = `https://${feed.host}/example-article`;
    const accepted = await parseNewsFeed(xml(entry('New anime announcement', articleUrl)), feed, now);
    assert.equal(accepted.length, 1);
    assert.equal(accepted[0].category, 'anime');
    assert.deepEqual(await parseNewsFeed(xml(entry('New anime announcement', 'https://example.org/evil')), feed, now), []);
  }
});

test('Chinese and English RSS sources preserve their language on news items', async () => {
  for (const name of ['巴哈姆特 GNN', 'NME Music']) {
    const feed = newsSources.find((item) => item.name === name)!;
    const articles = await parseNewsFeed(xml(entry('New anime announcement', `https://${feed.host}/article`)), feed, now);
    assert.equal(articles[0].language, feed.language);
  }
});

test('PTT official Atom feed parsing preserves safe article URLs and Chinese source language', async () => {
  const board = newsSources.find((feed) => feed.name === 'PTT C_Chat')!;
  const atom = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>批踢踢實業坊 C_Chat</title><updated>2026-11-12T07:00:00Z</updated>
      <entry>
        <title>[閒聊] 本季動畫推薦</title>
        <link href="https://www.ptt.cc/bbs/C_Chat/M.1794460000.A.123.html" />
        <id>https://www.ptt.cc/bbs/C_Chat/M.1794460000.A.123.html</id>
        <updated>2026-11-12T07:00:00Z</updated>
      </entry>
    </feed>`;
  const posts = await parseNewsFeed(atom, board, now);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].source, 'PTT C_Chat');
  assert.equal(posts[0].language, 'zh');
  assert.equal(posts[0].category, 'anime');
  assert.equal(posts[0].url, 'https://www.ptt.cc/bbs/C_Chat/M.1794460000.A.123.html');
});

test('PTT source registry lists official public boards without gossip board', () => {
  const expected = {
    C_Chat: 'anime',
    movie: 'topics',
    Steam: 'games',
  } as const;
  for (const [board, category] of Object.entries(expected)) {
    const feed = newsSources.find((entry) => entry.name === `PTT ${board}`);
    assert.ok(feed, `Missing PTT board ${board}`);
    assert.equal(feed.url, `https://www.ptt.cc/atom/${board}.xml`);
    assert.equal(feed.host, 'ptt.cc');
    assert.equal(feed.language, 'zh');
    assert.equal(feed.category, category);
  }
});
