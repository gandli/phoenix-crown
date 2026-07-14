import { useState } from "react";
import { destinations } from "./lib/destinations";
import { SiteHeader } from "./components/SiteHeader";
import { DestinationScene } from "./components/DestinationScene";
import { GalleryView } from "./components/GalleryView";
import { GalleryViewPro } from "./components/GalleryViewPro";

type View = "scene" | "gallery";

export default function App() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("scene");
  const [entrance, setEntrance] = useState(true);
  // opt-in "高级画廊" 变体对比: ?pro=1 启用 GalleryViewPro, 默认仍用 GalleryView
  const [pro] = useState(
    () => new URLSearchParams(window.location.search).get("pro") === "1",
  );

  const dark = destinations[index].theme === "dark";

  function go(update: () => void) {
    // `update` mutates navigation state (index/view); we also clear the
    // one-shot `entrance` flag so the roof-drop / curtain-reveal animation
    // replays on every navigation. In gallery view the flag is unused.
    update();
    setEntrance(false);
  }

  return (
    <main
      className={`paper-grain relative flex h-dvh flex-col overflow-hidden bg-[var(--background)] transition-colors duration-700 ${
        dark ? "dark" : ""
      }`}
    >
      <SiteHeader view={view} onViewChange={(v) => go(() => setView(v))} />

      {/* content area sits below the header in the flex column */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {view === "scene" ? (
          <>
            <DestinationScene
              destinations={destinations}
              index={index}
              entrance={entrance}
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
        ) : (
          pro ? (
            <GalleryViewPro
              destinations={destinations}
              initialIndex={index}
              onSelect={(i) => go(() => { setIndex(i); setView("scene"); })}
            />
          ) : (
            <GalleryView
              destinations={destinations}
              initialIndex={index}
              onSelect={(i) => go(() => { setIndex(i); setView("scene"); })}
            />
          )
        )}
      </div>
    </main>
  );
}
