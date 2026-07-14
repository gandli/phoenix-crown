// 轻量 i18n: 仅 UI 标签, 不翻译冠名/诗句(内容保留中文)
export type Lang = "zh" | "en";
export type ThemeMode = "dark" | "light";

const dict = {
  zh: {
    scene: "展陈",
    gallery: "集藏",
    prev: "上一顶",
    next: "下一顶",
    themeDark: "暗",
    themeLight: "亮",
    langLabel: "EN",
  },
  en: {
    scene: "Exhibit",
    gallery: "Collection",
    prev: "Prev crown",
    next: "Next crown",
    themeDark: "Dark",
    themeLight: "Light",
    langLabel: "中",
  },
} as const;

export function t(key: keyof (typeof dict)["zh"], lang: Lang): string {
  // defensive: unknown lang (e.g. malformed query/state) falls back to zh
  // rather than throwing on undefined dict access.
  return dict[lang]?.[key] ?? dict.zh[key];
}
