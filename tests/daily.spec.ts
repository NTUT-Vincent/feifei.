import { expect, test } from "@playwright/test";
import { readEdition } from "../lib/daily/loader";
const edition = readEdition(`${process.cwd()}/content`);

test("daily stories and punchlines expand inline and preserve personal settings", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "每日小報" });
  await expect(section.getByRole("article")).toHaveCount(edition.layout.sections.length);
  if (edition.layout.sections.some((s) => s.type === "story")) {
    await section.getByText("讀小故事", { exact: true }).first().click();
    await expect(section.locator(".daily-story-body").first()).toBeVisible();
  }
  if (edition.layout.sections.some((s) => s.type === "joke")) {
    await section.getByText("揭曉", { exact: true }).first().click();
    await expect(section.locator(".daily-joke details").first()).toHaveAttribute("open", "");
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const settings = await page.evaluate(() => localStorage.getItem("feifei.settings"));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("feifei.settings"))).toBe(settings);
  for (const link of await section.locator(".daily-source").all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("daily cards fit mobile through desktop in light and dark mode", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (edition.layout.sections.some((s) => s.type === "story")) await page.getByText("讀小故事", { exact: true }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole("button", { name: "切換深色" }).click();
  await expect(page.locator(".site")).toHaveAttribute("data-mode", "dark");
  await expect(page.getByRole("heading", { name: "每日小報" })).toBeVisible();
});
