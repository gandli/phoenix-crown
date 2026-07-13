import { useState } from "react";
import { destinations } from "./lib/destinations";
import { SiteHeader } from "./components/SiteHeader";
import { DestinationScene } from "./components/DestinationScene";
import { GalleryView } from "./components/GalleryView";

type View = "scene" | "gallery";

export default function App() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("scene");
  const [entrance, setEntrance] = useState(true);

  const prev = (index - 1 + destinations.length) % destinations.length;
  const next = (index + 1) % destinations.length;
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
      className={`paper-grain relative h-dvh overflow-hidden bg-[var(--background)] transition-colors duration-700 ${
        dark ? "dark" : ""
      }`}
    >
      <SiteHeader view={view} onViewChange={(v) => go(() => setView(v))} />

      {view === "scene" ? (
        <>
          <DestinationScene
            destination={destinations[index]}
            entrance={entrance}
            onPrev={() => go(() => setIndex(prev))}
            onNext={() => go(() => setIndex(next))}
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
        <GalleryView
          destinations={destinations}
          initialIndex={index}
          onSelect={(i) => go(() => { setIndex(i); setView("scene"); })}
        />
      )}
    </main>
  );
}
