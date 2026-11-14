import { expect, test } from '@playwright/test';
test('connected libraries paginate, drill down and add to existing queue without dialogs', async ({ page }) => {
  await page.route('**/api/connections', (route) => route.fulfill({ json: { connections: [{ provider: 'youtube', connected: true, enabled: true, displayName: '測試帳號' }] } }));
  await page.route('**/api/media/library?**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const json = params.get('source') === 'videos' ? { items: [{ id: 'v1', title: '清單影片', url: 'https://youtu.be/jfKfPfyJRdk' }], nextCursor: null } : params.has('cursor') ? { items: [{ id: 'p2', title: '第二頁', url: 'https://www.youtube.com/playlist?list=PL222222222222', collection: 'PL222222222222' }], nextCursor: null } : { items: [{ id: 'p1', title: '我的音樂', url: 'https://www.youtube.com/playlist?list=PL111111111111', collection: 'PL111111111111' }], nextCursor: 'page2' };
    return route.fulfill({ json });
  });
  await page.goto('/');
  const card = page.locator('.widget-youtube');
  await card.getByRole('button', { name: '換內容' }).click();
  await card.getByRole('button', { name: '我的清單', exact: true }).click();
  await expect(card.getByRole('button', { name: '我的音樂', exact: true })).toBeVisible();
  await card.getByRole('button', { name: '載入更多' }).click();
  await expect(card.getByRole('button', { name: '第二頁', exact: true })).toBeVisible();
  await card.getByRole('button', { name: '我的音樂', exact: true }).click();
  await card.getByRole('button', { name: '加入 清單影片' }).click();
  await expect(card.getByRole('button', { name: '1. 清單影片' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
test('library errors do not block anonymous search; disconnect updates the card', async ({ page }) => {
  let connected = true;
  await page.route('**/api/connections', (route) => route.fulfill({ json: { connections: [{ provider: 'youtube', connected, enabled: true, displayName: '測試帳號' }] } }));
  await page.route('**/api/connections/youtube', (route) => { connected = false; return route.fulfill({ json: { disconnected: true, revoked: true } }); });
  await page.route('**/api/media/library?**', (route) => route.fulfill({ status: 401, json: { error: '授權已過期' } }));
  await page.goto('/');
  const card = page.locator('.widget-youtube');
  await card.getByRole('button', { name: '換內容' }).click();
  await card.getByRole('button', { name: '我的清單', exact: true }).click();
  await expect(card.getByText('授權已過期')).toBeVisible();
  await expect(card.getByRole('textbox', { name: '搜尋或貼上網址' })).toBeEnabled();
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: '解除連結' }).click();
  await expect(page.getByRole('button', { name: '連結', exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: '連結帳號', exact: true })).toBeVisible();
});
test('API rejects cross-origin authorize and disconnect, unknown providers, and invalid callbacks', async ({ request }) => {
  expect((await request.post('/api/connections/youtube/authorize')).status()).toBe(403);
  expect((await request.delete('/api/connections/youtube')).status()).toBe(403);
  expect((await request.get('/api/media/library?provider=evil')).status()).toBe(400);
  const response = await request.get('/api/connections/youtube/callback?state=forged&code=forged', { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toContain('connection=failed');
});
