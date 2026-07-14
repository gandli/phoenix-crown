import { t, type Lang, type ThemeMode } from "../lib/i18n";

export function SiteHeader({
  view,
  lang,
  theme,
  onViewChange,
  onToggleLang,
  onCycleTheme,
}: {
  view: "scene" | "gallery";
  lang: Lang;
  theme: ThemeMode;
  onViewChange: (v: "scene" | "gallery") => void;
  onToggleLang: () => void;
  onCycleTheme: () => void;
}) {
  const navBtn = (active: boolean) =>
    `min-h-[44px] rounded-md px-3 font-mono text-xs underline-offset-4 transition-colors hover:bg-white/5 hover:underline ${
      active
        ? "bg-white/[0.06] text-[var(--foreground)] underline"
        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  return (
    <header className="pointer-events-auto relative z-30 mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-5 md:px-10">
      <div className="flex items-center gap-10">
        <span className="font-mono text-sm font-medium tracking-wide text-[var(--foreground)]">
          凤冠
        </span>
        <nav aria-label="Main" className="flex items-center gap-7">
          <button
            type="button"
            onClick={() => onViewChange("scene")}
            className={navBtn(view === "scene")}
          >
            {t("scene", lang)}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("gallery")}
            aria-current={view === "gallery" ? "page" : undefined}
            className={navBtn(view === "gallery")}
          >
            {t("gallery", lang)}
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCycleTheme}
          aria-label={theme === "dark" ? t("themeDark", lang) : t("themeLight", lang)}
          className="min-h-[44px] rounded-md px-3 font-mono text-xs text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
        >
          {theme === "dark" ? t("themeDark", lang) : t("themeLight", lang)}
        </button>
        <button
          type="button"
          onClick={onToggleLang}
          aria-label="Language"
          className="min-h-[44px] rounded-md px-3 font-mono text-xs text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
        >
          {t("langLabel", lang)}
        </button>
      </div>
    </header>
  );
}
