import { crownDataUri } from "../lib/crown-art";
import type { Destination } from "../lib/destinations";

/**
 * GalleryViewPro — "高级画廊" 变体 (redesign-skill 对比用)
 * 与原 GalleryView 的差异:
 *  - 去卡片边框/底色, 仅靠留白与冠图大小分层 (elevation via space, not border)
 *  - 非对称: 冠图更大, 序号小字代替平等卡片
 *  - hover: 冠图放大 + 极轻光晕, 名称提亮
 *  - 入场 stagger 更缓 (i*70ms)
 * 通过 App 的 ?pro=1 启用, 默认仍用 GalleryView。
 */
export function GalleryViewPro({
  destinations,
  initialIndex,
  onSelect,
}: {
  destinations: Destination[];
  initialIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto px-[10vw] py-[10%]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[clamp(2.5rem,6vh,5rem)]">
        {destinations.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onSelect(i)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`group flex items-center gap-6 text-left motion-safe:animate-fade-in-up sm:gap-10 ${
              i % 2 === 1 ? "sm:flex-row-reverse" : ""
            }`}
          >
            <div
              className={`relative shrink-0 transition-[transform,filter] duration-300 group-hover:scale-[1.04] ${
                i === initialIndex ? "opacity-100" : "opacity-90"
              }`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "var(--crown-glow)" }}
              />
              <img
                src={crownDataUri(d.art)}
                alt={d.phrase}
                className="h-28 w-auto object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:h-36"
              />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--muted-foreground)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                className={`mt-1 text-xl font-medium transition-colors duration-200 group-hover:text-[var(--foreground)] ${
                  i === initialIndex ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                }`}
              >
                {d.name}
              </div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">{d.phrase}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
