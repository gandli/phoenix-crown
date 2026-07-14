import { test, expect, type Page } from "@playwright/test";

/**
 * 真物理测试: 开启重力后模拟设备倾斜, 断言帘幕重心真实水平位移。
 * 直接读 curtain <canvas> 渲染像素算重心 x, 不依赖调试 hook。
 * 倾斜事件走与真机相同的 window 'deviceorientation' 监听代码路径。
 */
test.describe("重力感应物理", () => {
  async function curtainCentroidX(page: Page) {
    return page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!c) return 0.5;
      const ctx = c.getContext("2d");
      if (!ctx) return 0.5;
      const w = c.width;
      const h = c.height;
      const img = ctx.getImageData(0, 0, w, h).data;
      let sx = 0;
      let n = 0;
      const y0 = Math.floor(h * 0.15);
      const y1 = Math.floor(h * 0.6);
      for (let y = y0; y < y1; y += 3) {
        for (let x = 0; x < w; x += 3) {
          if (img[(y * w + x) * 4 + 3] > 30) {
            sx += x;
            n++;
          }
        }
      }
      return n ? (sx / n) / w : 0.5;
    });
  }

  async function tilt(page: Page, gamma: number, beta = 45) {
    await page.evaluate(
      ([g, b]) => {
        window.dispatchEvent(
          new DeviceOrientationEvent("deviceorientation", { gamma: g, beta: b }),
        );
      },
      [gamma, beta],
    );
  }

  test("右倾(gamma>0) 使帘幕重心右移", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2200); // 等 reveal 完成
    const gbtn = page.getByRole("button", { name: "重力", exact: true });
    await gbtn.click();
    await expect(gbtn).toHaveAttribute("aria-pressed", "true");

    await tilt(page, 0, 45);
    await page.waitForTimeout(600);
    const base = await curtainCentroidX(page);

    await tilt(page, 60, 45);
    await page.waitForTimeout(1600); // 给被限速的 rAF 足够时间收敛到倾斜平衡
    const tilted = await curtainCentroidX(page);

    expect(tilted - base).toBeGreaterThan(0.008);
  });

  test("左倾(gamma<0) 使帘幕重心左移", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2200);
    const gbtn = page.getByRole("button", { name: "重力", exact: true });
    await gbtn.click();
    await expect(gbtn).toHaveAttribute("aria-pressed", "true");

    await tilt(page, 0, 45);
    await page.waitForTimeout(600);
    const base = await curtainCentroidX(page);

    await tilt(page, -60, 45);
    await page.waitForTimeout(1600);
    const tilted = await curtainCentroidX(page);

    expect(base - tilted).toBeGreaterThan(0.008);
  });
});
