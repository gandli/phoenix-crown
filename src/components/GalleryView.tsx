import { crownDataUri } from "../lib/crown-art";
import type { Destination } from "../lib/destinations";

export function GalleryView({
  destinations,
  initialIndex,
  onSelect,
}: {
  destinations: Destination[];
  initialIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto px-[8vw] py-[8%] pb-[10%]">
      <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {destinations.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onSelect(i)}
            style={{ animationDelay: `${i * 55}ms` }}
            className={`group relative flex flex-col items-center rounded-xl p-5 text-center transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.03] active:scale-[0.98] motion-safe:animate-fade-in-up ${
              i === initialIndex ? "bg-white/[0.05]" : ""
            }`}
          >
            {/* hover 光晕: 仅交互时出现, 不抢戏 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-xl opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "var(--crown-glow)" }}
            />
            <img
              src={crownDataUri(d.art)}
              alt={d.phrase}
              loading="lazy"
              decoding="async"
              height={96}
              className="mb-3 h-24 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-105"
            />
            <div className="text-sm font-medium text-[var(--foreground)]">{d.name}</div>
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{d.phrase}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
