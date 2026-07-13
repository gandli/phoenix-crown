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
    <div className="pointer-events-auto absolute inset-x-0 bottom-[5%] top-0 overflow-y-auto px-[8vw] pb-[8%] pt-[96px]">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {destinations.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onSelect(i)}
            className={`group flex flex-col items-center rounded-lg border p-4 text-center transition-colors ${
              i === initialIndex
                ? "border-[var(--accent)] bg-white/5"
                : "border-white/10 hover:border-white/30"
            }`}
          >
            <img
              src={crownDataUri(d.art)}
              alt={d.phrase}
              className="mb-3 h-20 w-auto object-contain"
            />
            <div className="text-sm font-medium text-[var(--foreground)]">{d.name}</div>
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{d.phrase}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
