import { expect, test } from '@playwright/test';

// SDK fixture tests our integration only, not real third-party playback rights.
const sdk = `window.YT={Player:class {
 constructor(el,opts){this.opts=opts;this.frame=document.createElement('iframe');this.frame.title='YouTube fixture';el.replaceWith(this.frame);setTimeout(()=>opts.events.onReady(),0);}
 cueVideoById(v){this.frame.dataset.video=v.videoId;} loadVideoById(v){this.cueVideoById(v);}
 cuePlaylist(v){this.frame.dataset.list=v.list;} loadPlaylist(v){this.cuePlaylist(v);}
 setShuffle(v){this.frame.dataset.shuffle=String(v);} setLoop(v){this.frame.dataset.loop=String(v);}
 nextVideo(){} previousVideo(){} playVideo(){} destroy(){this.frame.remove();}
}};window.onYouTubeIframeAPIReady();`;

test('search, queue, next and persistence stay inside a card', async ({ page }) => {
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({ contentType: 'text/javascript', body: sdk }));
  await page.route('**/api/media/search?**', (route) => route.fulfill({ json: { items: [
    { title: '森林音樂', url: 'https://youtu.be/jfKfPfyJRdk' },
    { title: '雨天音樂', url: 'https://youtu.be/5qap5aO4i9A' },
  ] } }));
  await page.goto('/');
  const card = page.locator('.widget-youtube');
  await card.getByRole('button', { name: '換內容' }).click();
  await card.getByRole('textbox', { name: '搜尋或貼上網址' }).fill('森林');
  await card.getByRole('button', { name: '尋找' }).click();
  await card.getByRole('button', { name: '加入 森林音樂' }).click();
  await card.getByRole('button', { name: '加入 雨天音樂' }).click();
  await card.getByRole('button', { name: '播放 森林音樂' }).click();
  await expect(card.locator('iframe')).toHaveAttribute('data-video', 'jfKfPfyJRdk');
  const frame = await card.locator('iframe').elementHandle();
  await card.getByRole('button', { name: '下一個' }).click();
  await expect(card.locator('iframe')).toHaveAttribute('data-video', '5qap5aO4i9A');
  expect(await frame?.evaluate((el) => el.isConnected)).toBe(true);
  await card.getByRole('button', { name: '隨機播放' }).click();
  await expect(card.getByRole('button', { name: '隨機播放' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveAttribute('aria-label', '雨天音樂');
  await card.getByRole('button', { name: '換內容' }).click();
  await expect(card.getByRole('button', { name: '1. 森林音樂' })).toBeVisible();
  await card.getByRole('button', { name: '移除待播 森林音樂' }).click();
  await expect(card.getByRole('button', { name: '1. 雨天音樂' })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('YouTube and Twitch expand to at least two columns without losing saved width', async ({ page }) => {
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({ contentType: 'text/javascript', body: sdk }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const youtube = page.locator('.widget-youtube');
  const twitch = page.locator('.widget-twitch');
  await expect(youtube).toHaveCSS('grid-column-start', 'span 1');
  await youtube.getByRole('button', { name: '播放 lofi hip hop mix' }).click();
  await expect(youtube).toHaveCSS('grid-column-start', 'span 2');
  await youtube.getByRole('button', { name: '收起 lofi hip hop mix' }).click();
  await expect(youtube).toHaveCSS('grid-column-start', 'span 1');
  await twitch.getByRole('button', { name: '播放 Twitch 精選剪輯' }).click();
  await expect(twitch).toHaveCSS('grid-column-start', 'span 2');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
