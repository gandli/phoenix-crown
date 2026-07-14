import { test, expect } from "@playwright/test";

/**
 * UI/UX 无障碍审计修复 (TDD 红-绿驱动)
 * U1: <html lang> 随界面语言同步 (a11y §4 语义)
 */
test.describe("UX 无障碍", () => {
  test("U1: 切换语言同步 <html lang> (zh-CN ↔ en)", async ({ page }) => {
    await page.goto("/");
    // 默认中文
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    // 切到英文
    await page.getByRole("button", { name: "Language", exact: true }).click();
    await expect(page.getByRole("button", { name: "Exhibit" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("U2: 集藏卡片图懒加载 + 显式高度防 CLS", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "集藏" }).click();
    const img = page.locator(".grid img").first();
    await expect(img).toHaveAttribute("loading", "lazy");
    await expect(img).toHaveAttribute("decoding", "async");
    await expect(img).toHaveAttribute("height", /\d+/);
  });

  test("U5: 展陈 caption 短语用 text-pretty 排版", async ({ page }) => {
    await page.goto("/");
    const caption = page.locator("[data-curtain-avoid] .text-pretty");
    await expect(caption).toHaveCount(1);
  });
});
