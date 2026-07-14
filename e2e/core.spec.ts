import { test, expect } from "@playwright/test";

test.describe("凤冠 Phoenix Crown — 核心交互", () => {
  test("初始渲染: 首顶冠图与 sr-only 标题出现", async ({ page }) => {
    await page.goto("/");
    const crown = page.locator("img[alt]:not([alt=''])").first();
    await expect(crown).toBeVisible();
    // sr-only h1 = "Fengguan —— ..."
    await expect(page.locator("h1.sr-only")).toContainText("Fengguan");
  });

  test("prev/next 切换: 点下一顶后冠名变化", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1.sr-only");
    await expect(h1).toContainText("Fengguan");
    await page.getByRole("button", { name: /下一顶/ }).click();
    // 第二顶为 Xifeng
    await expect(h1).toContainText("Xifeng", { timeout: 5000 });
  });

  test("主题切换: 暗 ↔ 亮 改 data-theme", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main");
    await expect(main).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "暗" }).click();
    await expect(main).toHaveAttribute("data-theme", "light");
  });

  test("语言切换: 中 → EN 导航变 Exhibit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "展陈" })).toBeVisible();
    await page.getByRole("button", { name: "Language", exact: true }).click();
    await expect(page.getByRole("button", { name: "Exhibit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Collection" })).toBeVisible();
  });

  test("集藏页: 打开网格并点选回展陈", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "集藏" }).click();
    const card = page.getByRole("button", { name: /Fengguan/ }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator("h1.sr-only")).toBeVisible();
  });

  test("?pro=1: 高级画廊变体可打开集藏", async ({ page }) => {
    await page.goto("/?pro=1");
    await page.getByRole("button", { name: "集藏" }).click();
    const card = page.getByRole("button", { name: /Fengguan/ }).first();
    await expect(card).toBeVisible();
  });

  test("favicon + OG 资源可访问 (锁定 #44)", async ({ request }) => {
    const favicon = await request.get("/favicon.svg");
    expect(favicon.status()).toBe(200);
    expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
    const og = await request.get("/og-image.png");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
  });
});
