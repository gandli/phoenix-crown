import { useState } from "react";
import { TextCurtain } from "./TextCurtain";
import { crownDataUri } from "../lib/crown-art";
import type { Destination } from "../lib/destinations";
import { t, type Lang } from "../lib/i18n";
import type { GravityVec } from "../lib/gravity";

/**
 * Crown image with a graceful load-failure surface (Q4): if the PNG fails to
 * load (e.g. CORS / missing asset), show a discreet gold-bordered placeholder
 * instead of a broken-image icon, so the scene never looks broken.
 */
function CrownImg({
  art,
  alt,
  className,
  decorative = false,
  id,
}: {
  art: Destination["art"];
  alt: string;
  className: string;
  decorative?: boolean;
  id?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        id={id}
        className={`flex items-center justify-center rounded-lg border border-[var(--border)] bg-white/[0.03] text-[var(--muted-foreground)] ${className}`}
        aria-hidden={decorative}
      >
        <span className="px-2 text-center text-xs">冠图加载失败</span>
      </div>
    );
  }
  return (
    <img
      id={id}
      src={crownDataUri(art)}
      alt={alt}
      aria-hidden={decorative}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function DestinationScene({
  destinations,
  index,
  entrance = true,
  dark,
  lang = "zh",
  onIndex,
  gravity,
}: {
  destinations: Destination[];
  index: number;
  entrance?: boolean;
  dark: boolean;
  lang?: Lang;
  onIndex: (i: number) => void;
  gravity?: GravityVec;
}) {
  const destination = destinations[index];
  const sceneIn = entrance ? "scene-in" : "";
  const n = destinations.length;
  const prevIdx = (index - 1 + n) % n;
  const nextIdx = (index + 1) % n;
  const prev = destinations[prevIdx];
  const next = destinations[nextIdx];

  const navBtn =
    "group pointer-events-auto absolute top-[52%] -translate-y-1/2 z-20 flex w-[14%] max-w-[92px] flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] p-2 backdrop-blur-[2px] transition-[transform,border-color,background-color] duration-200 hover:border-white/35 hover:bg-white/[0.07] active:scale-[0.97] focus-visible:border-[var(--ring)]";

  return (
    <div className="pointer-events-none absolute inset-0">
      {dark && (
        <div
          aria-hidden
          className={`absolute left-1/2 top-[8%] h-[50%] -translate-x-1/2 ${sceneIn}`}
          style={{
            width: "clamp(520px, 60vw, 1100px)",
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
          width: `min(calc(clamp(240px, 30vw, 640px) * ${destination.curtainWidth} + 40vw), 98vw)`,
        }}
      >
        <TextCurtain
          charPool={destination.charPool}
          colors={destination.curtainColors}
          inkAlpha={dark ? 1 : 0.62}
          luminous={dark}
          contourSelector={`#roof-${destination.id}`}
          avoidSelector="[data-curtain-avoid]"
          gravity={gravity}
        />
      </div>

      {/* crown art above the curtain */}
      <div
        className={`absolute left-1/2 top-[5%] -translate-x-1/2 ${entrance ? "roof-in" : ""}`}
        style={{ width: dark ? "clamp(240px, 30vw, 640px)" : "clamp(320px, 38vw, 760px)" }}
      >
        <CrownImg
          key={destination.art}
          art={destination.art}
          alt={destination.phrase}
          id={`roof-${destination.id}`}
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
        aria-label={`${t("prev", lang)}：${prev.name}`}
        onClick={() => onIndex(prevIdx)}
        className={`${navBtn} left-[3vw] lg:left-[7vw]`}
      >
        <CrownImg
          key={prev.art}
          art={prev.art}
          alt=""
          decorative
          className="h-14 w-auto opacity-70 transition-opacity group-hover:opacity-100"
        />
        <span className="line-clamp-1 text-center text-[10px] leading-tight text-[var(--muted-foreground)]">
          {prev.name}
        </span>
      </button>
      <button
        type="button"
        aria-label={`${t("next", lang)}：${next.name}`}
        onClick={() => onIndex(nextIdx)}
        className={`${navBtn} right-[3vw] lg:right-[7vw]`}
      >
        <CrownImg
          key={next.art}
          art={next.art}
          alt=""
          decorative
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
