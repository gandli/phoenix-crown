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
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {destinations.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onSelect(i)}
            style={{ animationDelay: `${i * 55}ms` }}
            className={`group flex flex-col items-center rounded-lg border p-4 text-center transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-white/30 active:scale-[0.98] motion-safe:animate-fade-in-up ${
              i === initialIndex
                ? "border-[var(--accent)] bg-white/5"
                : "border-[var(--border)]"
            }`}
          >
            <img
              src={crownDataUri(d.art)}
              alt={d.phrase}
              className="mb-3 h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div className="text-sm font-medium text-[var(--foreground)]">{d.name}</div>
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{d.phrase}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
