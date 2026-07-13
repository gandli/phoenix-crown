import { TextCurtain } from "./TextCurtain";
import { crownDataUri } from "../lib/crown-art";
import type { Destination } from "../lib/destinations";

export function DestinationScene({
  destination,
  onPrev,
  onNext,
  entrance = true,
}: {
  destination: Destination;
  onPrev: () => void;
  onNext: () => void;
  entrance?: boolean;
}) {
  const dark = destination.theme === "dark";
  const sceneIn = entrance ? "scene-in" : "";

  return (
    <div className="pointer-events-none absolute inset-0">
      {dark && (
        <div
          aria-hidden
          className={`absolute left-1/2 top-[8%] h-[50%] -translate-x-1/2 ${sceneIn}`}
          style={{
            width: "clamp(440px, 56vw, 900px)",
            background:
              "radial-gradient(ellipse at center, rgba(96,126,204,0.16) 0%, rgba(58,88,160,0.07) 45%, transparent 72%)",
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
              ? "h-auto w-full drop-shadow-[0_0_28px_rgba(96,126,204,0.35)]"
              : "h-auto w-full drop-shadow-[0_14px_18px_rgba(74,58,40,0.22)]"
          }
        />
      </div>

      {/* prev / next click zones */}
      <button
        aria-label="previous"
        onClick={onPrev}
        className="pointer-events-auto absolute inset-y-0 left-0 w-[18%] cursor-pointer bg-transparent"
      />
      <button
        aria-label="next"
        onClick={onNext}
        className="pointer-events-auto absolute inset-y-0 right-0 w-[18%] cursor-pointer bg-transparent"
      />

      <h1 className="sr-only">
        {destination.name} —— {destination.headingRest}
      </h1>
    </div>
  );
}
