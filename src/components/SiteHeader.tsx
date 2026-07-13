export function SiteHeader({
  view,
  onViewChange,
}: {
  view: "scene" | "gallery";
  onViewChange: (v: "scene" | "gallery") => void;
}) {
  return (
    <header className="pointer-events-auto relative z-30 flex items-center px-6 py-5 md:px-10">
      <div className="flex items-center gap-10">
        <span className="font-mono text-sm font-medium tracking-wide text-[var(--foreground)]">
          凤冠
        </span>
        <nav aria-label="Main" className="flex items-center gap-7">
          <button
            type="button"
            onClick={() => onViewChange("scene")}
            className={`font-mono text-xs underline-offset-4 transition-colors hover:underline ${
              view === "scene"
                ? "text-[var(--foreground)] underline"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            展陈
          </button>
          <button
            type="button"
            onClick={() => onViewChange("gallery")}
            aria-current={view === "gallery" ? "page" : undefined}
            className={`font-mono text-xs underline-offset-4 transition-colors hover:underline ${
              view === "gallery"
                ? "text-[var(--foreground)] underline"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            集藏
          </button>
        </nav>
      </div>
    </header>
  );
}
