import { test, expect, type Page } from "@playwright/test";

/**
 * 回归: 切换明暗主题, 凤冠渲染尺寸必须保持一致 (bug #? 亮色冠图容器被
 * 单独放大). 直接测 #roof-* 冠图实际渲染宽度.
 */
test.describe("凤冠主题尺寸一致性", () => {
  async function crownWidth(page: Page) {
    return page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>("#roof-fengguan");
      if (!img) return -1;
      const r = img.getBoundingClientRect();
      return Math.round(r.width);
    });
  }

  test("亮色与暗色下凤冠渲染宽度一致", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1800);
    const darkW = await crownWidth(page);
    // 头部第 3 个按钮是主题切换 (展陈/集藏/主题/Language/重力)
    await page.locator("header button").nth(2).click();
    await page.waitForTimeout(900);
    const lightW = await crownWidth(page);
    expect(darkW).toBeGreaterThan(0);
    expect(lightW).toBe(darkW);
  });
});
