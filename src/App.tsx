import { useState, useEffect } from "react";
import { destinations } from "./lib/destinations";
import { SiteHeader } from "./components/SiteHeader";
import { DestinationScene } from "./components/DestinationScene";
import { GalleryView } from "./components/GalleryView";
import { GalleryViewPro } from "./components/GalleryViewPro";
import { useGravity } from "./lib/gravity";
import { type Lang, type ThemeMode } from "./lib/i18n";

type View = "scene" | "gallery";

export default function App() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("scene");
  const [entrance, setEntrance] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem("pc-theme") as ThemeMode) || "dark",
  );
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("pc-lang") as Lang) || "zh",
  );
  // opt-in "高级画廊" 变体对比: ?pro=1 启用 GalleryViewPro, 默认仍用 GalleryView
  const [pro] = useState(
    () =>
      new URLSearchParams(window.location.search).get("pro") === "1" ||
      localStorage.getItem("pc-pro") === "1",
  );

  // device-tilt gravity for the hanging curtain (HTTPS only; desktop no-op)
  const { gravity, supported: gravitySupported, active: gravityActive, toggle: toggleGravity } =
    useGravity();

  // 持久化用户选择, 刷新/分享链接不丢失
  useEffect(() => {
    localStorage.setItem("pc-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("pc-lang", lang);
  }, [lang]);

  // effective darkness for the curtain/crown rendering (no auto mode)
  const effectiveDark = theme === "dark";
  // data-theme attribute drives the CSS token override
  const dataTheme: "dark" | "light" = theme;

  function go(update: () => void) {
    // `update` mutates navigation state (index/view); we also clear the
    // one-shot `entrance` flag so the roof-drop / curtain-reveal animation
    // replays on every navigation. In gallery view the flag is unused.
    update();
    setEntrance(false);
  }

  return (
    <main
      data-theme={dataTheme}
      className="paper-grain relative flex h-dvh flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-700"
    >
      <SiteHeader
        view={view}
        lang={lang}
        theme={theme}
        gravitySupported={gravitySupported}
        gravityActive={gravityActive}
        onToggleGravity={toggleGravity}
        onViewChange={(v) => go(() => setView(v))}
        onToggleLang={() => setLang((l) => (l === "zh" ? "en" : "zh"))}
        onCycleTheme={() =>
          setTheme((m) => (m === "dark" ? "light" : "dark"))
        }
      />
      {/* content area sits below the header in the flex column */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {view === "scene" ? (
          <>
            <DestinationScene
              destinations={destinations}
              index={index}
              entrance={entrance}
              dark={effectiveDark}
              lang={lang}
              gravity={gravity}
              onIndex={(i) => go(() => setIndex(i))}
            />
            <div
              data-curtain-avoid
              className="pointer-events-none absolute bottom-[3%] left-1/2 -translate-x-1/2 text-center"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                {destinations[index].phraseNote}
              </div>
              <div className="mt-1 text-base text-[var(--foreground)]">
                {destinations[index].phrase}
              </div>
            </div>
          </>
        ) : pro ? (
          <GalleryViewPro
            destinations={destinations}
            initialIndex={index}
            onSelect={(i) => go(() => {
              setIndex(i);
              setView("scene");
            })}
          />
        ) : (
          <GalleryView
            destinations={destinations}
            initialIndex={index}
            onSelect={(i) => go(() => {
              setIndex(i);
              setView("scene");
            })}
          />
        )}
      </div>
    </main>
  );
}
