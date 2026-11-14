import { expect, test } from "@playwright/test";

test("opens Google in a new tab, keeps Feifei, and ignores whitespace", async ({ context, page }) => {
  await context.route("https://www.google.com/search?**", (route) => route.fulfill({ body: "Google" }));
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Google 搜尋" });
  await input.fill("   ");
  await page.getByRole("button", { name: "搜尋", exact: true }).click();
  expect(context.pages()).toHaveLength(1);
  await input.fill("動畫 & 音樂");
  const [popup] = await Promise.all([context.waitForEvent("page"), input.press("Enter")]);
  await popup.waitForLoadState();
  expect(new URL(popup.url()).searchParams.get("q")).toBe("動畫 & 音樂");
  await expect(page.getByRole("heading", { name: "feifei." })).toBeVisible();
});

test("creates, edits, reorders and deletes shortcuts, with URL validation and persistence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新增", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("名稱").fill("測試捷徑");
  await dialog.getByLabel("網址").fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "儲存" }).click();
  await expect(dialog.getByRole("alert")).toContainText("有效");
  await dialog.getByLabel("網址").fill("https://example.org/music");
  await dialog.getByRole("button", { name: "星星" }).click();
  await dialog.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByRole("link", { name: "測試捷徑" })).toHaveAttribute("target", "_blank");
  await page.reload();
  await expect(page.getByRole("link", { name: "測試捷徑" })).toHaveAttribute("href", "https://example.org/music");
  await page.getByRole("button", { name: "編輯版面" }).click();
  await page.getByRole("button", { name: "測試捷徑 捷徑往前移" }).click();
  await expect(page.locator(".shortcut-list > li").nth(5)).toContainText("測試捷徑");
  await page.getByRole("button", { name: "編輯捷徑 測試捷徑" }).click();
  await dialog.getByLabel("名稱").fill("改名捷徑");
  await dialog.getByRole("button", { name: "儲存" }).click();
  await page.getByRole("button", { name: "刪除捷徑 改名捷徑" }).click();
  await expect(page.getByRole("link", { name: "改名捷徑" })).toHaveCount(0);
});

test("drags, resizes, removes and restores widgets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "編輯版面" }).click();
  const widgets = page.locator(".widget-grid > article");
  await page.getByRole("button", { name: "拖曳 lofi hip hop mix" }).dragTo(widgets.nth(1));
  await expect(widgets.first()).toHaveAttribute("aria-label", "Twitch 精選剪輯");
  await page.getByRole("button", { name: "編輯 Twitch 精選剪輯" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("桌面寬度").selectOption("2");
  await dialog.getByRole("button", { name: "儲存" }).click();
  await expect(widgets.first()).toHaveCSS("grid-column-start", "span 2");
  await page.getByRole("button", { name: "移除 lofi hip hop mix" }).click();
  await expect(widgets).toHaveCount(2);
  await page.getByRole("button", { name: "新增小工具" }).click();
  await dialog.getByRole("button", { name: "YouTube" }).click();
  await page.getByRole("button", { name: "新增小工具" }).click();
  await dialog.getByRole("button", { name: "PTT" }).click();
  await expect(page.getByRole("link", { name: "C_Chat", exact: true })).toHaveAttribute("href", "https://www.ptt.cc/bbs/C_Chat/index.html");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.reload();
  await expect(widgets).toHaveCount(4);
  await expect(widgets.first()).toHaveCSS("grid-column-start", "span 2");
});

test("edits a media URL and rejects links from other providers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "編輯版面" }).click();
  await page.getByRole("button", { name: "編輯 lofi hip hop mix" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("網址").fill("https://example.org/");
  await dialog.getByRole("button", { name: "儲存" }).click();
  await expect(dialog.getByRole("alert")).toContainText("YouTube");
  await dialog.getByLabel("名稱").fill("我的影片");
  await dialog.getByLabel("網址").fill("https://youtu.be/M7lc1UVf-VE");
  await dialog.getByRole("button", { name: "儲存" }).click();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("link", { name: "在 YouTube 開啟 我的影片" })).toHaveAttribute("href", "https://youtu.be/M7lc1UVf-VE");
});

test("changes and persists appearance, then resets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "薄荷綠" }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "mint");
  await dialog.getByRole("button", { name: "芋泥紫" }).click();
  await dialog.getByRole("button", { name: "深色", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".site")).toHaveAttribute("data-mode", "dark");
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "lavender");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await dialog.getByRole("button", { name: "還原預設首頁" }).click();
  await dialog.getByRole("button", { name: "還原", exact: true }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "peach");
  await expect(page.locator(".site")).toHaveAttribute("data-mode", "light");
});

test("keeps one active embed and source links available", async ({ page, context }) => {
  for (const host of ["clips.twitch.tv", "open.spotify.com"]) {
    await context.route(`https://${host}/**`, (route) => route.fulfill({ body: "Embed test fixture" }));
  }
  await page.goto("/");
  for (const [title, host, label] of [
    ["Twitch 精選剪輯", "clips.twitch.tv", "Twitch"],
    ["lofi beats", "open.spotify.com", "Spotify"],
  ]) {
    await page.getByRole("button", { name: `播放 ${title}` }).click();
    const card = page.getByRole("article", { name: title, exact: true });
    await expect(card.locator("iframe")).toHaveAttribute("src", new RegExp(host));
    await expect(card.getByRole("link", { name: `在 ${label} 開啟` })).toHaveAttribute("target", "_blank");
    await expect(page.locator(".widget iframe")).toHaveCount(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("recovers from a failed backend and validates API input", async ({ page, request, context }) => {
  expect((await request.get("/api/embed")).status()).toBe(400);
  expect((await request.get("/api/media/search?provider=youtube&q=" )).status()).toBe(400);
  expect((await request.get("/api/embed", { params: { provider: "twitch", url: "https://evil.example/" } })).status()).toBe(422);
  await context.route("**/api/embed?**", (route) => route.fulfill({ status: 503 }), { times: 1 });
  await context.route("https://open.spotify.com/**", (route) => route.fulfill({ body: "Embed test fixture" }));
  await page.goto("/");
  await page.getByRole("button", { name: "播放 lofi beats" }).click();
  const card = page.getByRole("article", { name: "lofi beats", exact: true });
  await expect(card.getByRole("status")).toContainText("播放器暫時無法載入");
  await card.getByRole("button", { name: "重試" }).click();
  await expect(card.locator("iframe")).toHaveAttribute("src", /open.spotify/);
});

test("fits phone, tablet and desktop and shows a Twitch link at narrow widths", async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "feifei." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "播放 Twitch 精選剪輯" }).click();
  const card = page.getByRole("article", { name: "Twitch 精選剪輯", exact: true });
  await expect(card.getByRole("status")).toContainText("畫面太窄");
  await expect(card.locator("iframe")).toHaveCount(0);
  await expect(card.getByRole("link", { name: "在 Twitch 開啟" })).toBeVisible();
});

test("restores defaults after invalid local data", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("feifei.settings", "{malformed"));
  await page.goto("/");
  await expect(page.locator(".site")).toHaveAttribute("data-theme", "peach");
  await expect(page.locator(".widget-grid > article")).toHaveCount(3);
});
