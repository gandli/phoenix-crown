import { describe, it, expect } from "vitest";
import { t } from "./i18n";

describe("i18n.t", () => {
  it("returns Chinese UI labels for zh", () => {
    expect(t("scene", "zh")).toBe("展陈");
    expect(t("gallery", "zh")).toBe("集藏");
    expect(t("prev", "zh")).toBe("上一顶");
    expect(t("next", "zh")).toBe("下一顶");
    expect(t("themeDark", "zh")).toBe("暗");
    expect(t("themeLight", "zh")).toBe("亮");
  });

  it("returns English UI labels for en", () => {
    expect(t("scene", "en")).toBe("Exhibit");
    expect(t("gallery", "en")).toBe("Collection");
    expect(t("prev", "en")).toBe("Prev crown");
    expect(t("next", "en")).toBe("Next crown");
    expect(t("themeDark", "en")).toBe("Dark");
    expect(t("themeLight", "en")).toBe("Light");
  });

  it("falls back to zh for an unknown lang code", () => {
    // @ts-expect-error intentional: exercise fallback branch
    expect(t("scene", "fr")).toBe("展陈");
  });
});
