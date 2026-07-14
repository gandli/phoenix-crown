import { TextCurtain } from "./TextCurtain";
import { crownDataUri } from "../lib/crown-art";
import type { Destination } from "../lib/destinations";

export function DestinationScene({
  destinations,
  index,
  entrance = true,
  onIndex,
}: {
  destinations: Destination[];
  index: number;
  entrance?: boolean;
  onIndex: (i: number) => void;
}) {
  const destination = destinations[index];
  const dark = destination.theme === "dark";
  const sceneIn = entrance ? "scene-in" : "";
  const n = destinations.length;
  const prevIdx = (index - 1 + n) % n;
  const nextIdx = (index + 1) % n;
  const prev = destinations[prevIdx];
  const next = destinations[nextIdx];

  const navBtn =
    "group pointer-events-auto absolute top-[52%] -translate-y-1/2 z-20 flex w-[14%] max-w-[92px] flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] p-2 backdrop-blur-[2px] transition-colors hover:border-white/35 hover:bg-white/[0.07] focus-visible:border-[var(--ring)]";

  return (
    <div className="pointer-events-none absolute inset-0">
      {dark && (
        <div
          aria-hidden
          className={`absolute left-1/2 top-[8%] h-[50%] -translate-x-1/2 ${sceneIn}`}
          style={{
            width: "clamp(440px, 56vw, 900px)",
            background:
              "radial-gradient(ellipse at center, var(--crown-glow) 0%, var(--crown-glow-soft) 45%, transparent 72%)",
            filter: "blur(10px)",
          }}
        />
      )}

      {/* hanging text curtain */}
      <div
        className={`pointer-events-auto absolute bottom-[14%] left-1/2 top-[5%] -translate-x-1/2 ${sceneIn}`}
        style={{
          width: `min(calc(clamp(220px, 26vw, 440px) * ${destination.curtainWidth} + 40vw), 98vw)`,
        }}
      >
        <TextCurtain
          charPool={destination.charPool}
          colors={destination.curtainColors}
          inkAlpha={dark ? 1 : 0.62}
          luminous={dark}
          contourSelector={`#roof-${destination.id}`}
          avoidSelector="[data-curtain-avoid]"
        />
      </div>

      {/* crown art above the curtain */}
      <div
        className={`absolute left-1/2 top-[5%] -translate-x-1/2 ${entrance ? "roof-in" : ""}`}
        style={{ width: dark ? "clamp(220px, 26vw, 440px)" : "clamp(300px, 34vw, 560px)" }}
      >
        <img
          id={`roof-${destination.id}`}
          src={crownDataUri(destination.art)}
          alt={destination.phrase}
          className={
            dark
              ? "h-auto w-full drop-shadow-[0_0_28px_var(--crown-shadow)]"
              : "h-auto w-full drop-shadow-[0_14px_18px_var(--crown-shadow-light)]"
          }
        />
      </div>

      {/* visible prev / next crown previews — guide the eye to the other crowns */}
      <button
        type="button"
        aria-label={`上一顶：${prev.name}`}
        onClick={() => onIndex(prevIdx)}
        className={`${navBtn} left-[3vw]`}
      >
        <img
          src={crownDataUri(prev.art)}
          alt=""
          aria-hidden
          className="h-14 w-auto opacity-70 transition-opacity group-hover:opacity-100"
        />
        <span className="line-clamp-1 text-center text-[10px] leading-tight text-[var(--muted-foreground)]">
          {prev.name}
        </span>
      </button>
      <button
        type="button"
        aria-label={`下一顶：${next.name}`}
        onClick={() => onIndex(nextIdx)}
        className={`${navBtn} right-[3vw]`}
      >
        <img
          src={crownDataUri(next.art)}
          alt=""
          aria-hidden
          className="h-14 w-auto opacity-70 transition-opacity group-hover:opacity-100"
        />
        <span className="line-clamp-1 text-center text-[10px] leading-tight text-[var(--muted-foreground)]">
          {next.name}
        </span>
      </button>

      <h1 className="sr-only">
        {destination.name} —— {destination.headingRest}
      </h1>
    </div>
  );
}
