import { useEffect, useRef } from "react";
import {
  prepareWithSegments,
  measureLineStats,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import type { GravityVec } from "../lib/gravity";
import { gravityBus, GRAVITY_CHANGE } from "../lib/gravity";

type Node = {
  x: number;
  y: number;
  px: number;
  py: number;
  homeX: number;
  homeY: number;
  char: string;
  alpha: number;
  visible: boolean;
  color: string;
  /** cached atlas source rect — avoids Map lookups in the draw loop */
  cell: { sx: number; sy: number } | null;
};

type Props = {
  charPool: string;
  className?: string;
  color?: string;
  /** Multi-color ink palette. When provided, strands are painted in short
   * vertical runs drawn from these colors (overrides `color`). */
  colors?: string[];
  /** Base ink opacity (0-1). Light paper scenes read well around 0.62;
   * dark scenes need ~0.95 so the ink sits on the same level as the
   * brightly-lit artwork. */
  inkAlpha?: number;
  /** Dark-scene mode: heavier stroke weight plus a soft same-color glow so
   * thin glyphs read as lit jewelry instead of dim ink. */
  luminous?: boolean;
  /** CSS selector for an <img> whose alpha silhouette the curtain should
   * hang from. Each column's pin point follows the image's bottom contour;
   * columns with no image above them are clipped. */
  contourSelector?: string;
  /** CSS selector for elements (headline, captions) the curtain should fade
   * out behind so overlapping copy stays readable. */
  avoidSelector?: string;
  /** Live device-tilt gravity vector {x,y} in [-1,1]; the verlet curtain
   * reads it each frame so the strands lean/swing with phone tilt. Desktop
   * (no sensor) passes {0,0} and the curtain keeps its mouse-brush behaviour. */
  gravity?: GravityVec;
};

const COL_SPACING = 8.5;
const ROW_SPACING = 12;
const FONT_SIZE = 10;
const MOUSE_RADIUS = 120;
const DAMPING = 0.94;
const HOME_STIFFNESS = 0.014;
// tilt gravity strength: scaled so a full phone tilt visibly leans the lower
// strands (tens of px) rather than a sub-pixel nudge; HOME_STIFFNESS pulls it
// back toward straight when the device is level.
const GRAVITY_STRENGTH = 2.0;
const CONSTRAINT_ITERATIONS = 2;
const ALPHA_THRESHOLD = 40; // 0-255 canvas alpha cutoff for "opaque" crown pixel
const FALLBACK_CHAR = "文"; // used when a pool index resolves to undefined

// font used both for the atlas raster and for the pretext measurement, so the
// measured advance matches exactly what gets drawn.
const FONT_SPEC = (luminous: boolean) =>
  `${luminous ? 500 : 300} ${FONT_SIZE}px 'Songti SC', 'Noto Serif SC', serif`;

/**
 * A curtain of characters. Each column is a verlet chain pinned at the top;
 * the cursor parts the strands like fabric and they sway back into place.
 * When contourSelector is provided, the pins trace the silhouette (bottom
 * edge) of that image, so the curtain hangs from the path of the roof rather
 * than a straight line.
 *
 * Ported 1:1 from aigc17/Chinese-PhoenixCrown (React/Vite build, audio removed).
 */
export function TextCurtain({
  charPool,
  className,
  color = "#4a3a28",
  colors,
  inkAlpha = 0.62,
  luminous = false,
  contourSelector,
  avoidSelector,
  gravity = { x: 0, y: 0 },
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns: Node[][] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let time = 0;
    let lastFrame = performance.now();

    // pretext handle — measures the real per-glyph advance (no DOM layout),
    // so columns space by true CJK width instead of the hardcoded grid.
    let prepared: PreparedTextWithSegments | null = null;
    try {
      prepared = prepareWithSegments(charPool, FONT_SPEC(luminous));
    } catch {
      prepared = null;
    }

    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
    // a stationary pointer should stop "holding" the strands so they spring
    // back to rest — only a *moving* cursor actually brushes the fabric.
    let lastMove = 0;
    const IDLE_MS = 120;
    // last time the user interacted (pointer move/leave) or reveal started —
    // breeze only runs during/after interaction, so the curtain can fall
    // fully still and the rAF loop can stop when truly idle.
    let lastInteract = performance.now();
    function isBrushing(): boolean {
      return mouse.active && performance.now() - lastMove < IDLE_MS;
    }

    // alpha map of the contour image, sampled once per image load
    let contourPixels: Uint8ClampedArray | null = null;
    let contourW = 0;
    let contourH = 0;

    // --- glyph atlas -------------------------------------------------
    // fillText for thousands of glyphs per frame is the bottleneck, so every
    // unique char+color pair is rasterized once into an offscreen atlas and
    // stamped with drawImage each frame instead.
    let atlas: HTMLCanvasElement | null = null;
    let atlasMap = new Map<string, { sx: number; sy: number }>();
    const ATLAS_PAD = 3;
    let atlasCell = 0; // device-pixel cell pitch
    let atlasCellCss = 0; // css-pixel draw size

    function buildAtlas() {
      const inks = colors && colors.length > 0 ? Array.from(new Set(colors)) : [color];
      const chars = Array.from(new Set(charPool.split("")));
      const scale = dpr;
      atlasCellCss = FONT_SIZE + ATLAS_PAD * 2;
      // exact float pitch so source rects line up with the scaled grid
      atlasCell = atlasCellCss * scale;

      const total = chars.length * inks.length;
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);

      atlas = document.createElement("canvas");
      atlas.width = Math.ceil(cols * atlasCell);
      atlas.height = Math.ceil(rows * atlasCell);
      const actx = atlas.getContext("2d");
      if (!actx) {
        atlas = null;
        return;
      }
      actx.scale(scale, scale);
      actx.font = FONT_SPEC(luminous);
      actx.textAlign = "center";
      actx.textBaseline = "middle";

      atlasMap = new Map();
      let i = 0;
      for (const ink of inks) {
        actx.fillStyle = ink;
        for (const ch of chars) {
          const cx = (i % cols) * atlasCellCss;
          const cy = Math.floor(i / cols) * atlasCellCss;
          actx.fillText(ch, cx + atlasCellCss / 2, cy + atlasCellCss / 2);
          atlasMap.set(`${ch}|${ink}`, { sx: cx * scale, sy: cy * scale });
          i++;
        }
      }
    }
    // -----------------------------------------------------------------

    // the curtain stays invisible until the roof image has loaded and its
    // contour is sampled, then fades in after the roof drops
    let reveal = 0;
    let revealAt = Infinity;

    // accessibility: respect reduced-motion — render the curtain static
    // (no drop-in, no idle breeze, no mouse interaction) when the user
    // asks for less motion. We still draw once so the art reads.
    const reduceMotion =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    // canvas-space rects (headline, captions) the strands fade behind
    let avoidRects: { left: number; top: number; right: number; bottom: number }[] = [];
    const AVOID_FEATHER = 48;

    function sampleAvoidRects() {
      avoidRects = [];
      if (!avoidSelector) return;
      const canvasRect = canvas!.getBoundingClientRect();
      document.querySelectorAll(avoidSelector).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        avoidRects.push({
          left: r.left - canvasRect.left,
          top: r.top - canvasRect.top,
          right: r.right - canvasRect.left,
          bottom: r.bottom - canvasRect.top,
        });
      });
    }

    /** 1 outside copy blocks, fading to ~0 inside them */
    function avoidFadeAt(x: number, y: number): number {
      let fade = 1;
      for (const r of avoidRects) {
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < AVOID_FEATHER) {
          const f = 0.06 + (d / AVOID_FEATHER) * 0.94;
          if (f < fade) fade = f;
        }
      }
      return fade;
    }

    function rand(seed: number): number {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    function sampleContourImage(img: HTMLImageElement) {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return;
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0);
      try {
        contourPixels = octx.getImageData(0, 0, w, h).data;
        contourW = w;
        contourH = h;
      } catch {
        contourPixels = null;
      }
    }

    /**
     * For a given canvas-space x, walk the contour image column from the
     * bottom up and return the canvas-space y of the lowest opaque pixel (the
     * roof's under-eave path). Returns null when nothing hangs there.
     */
    function contourYAt(canvasX: number): number | null {
      const img = document.querySelector(contourSelector!) as HTMLImageElement | null;
      if (!img) return 0;
      const imgRect = img.getBoundingClientRect();
      const canvasRect = canvas!.getBoundingClientRect();
      const pageX = canvasRect.left + canvasX;
      if (pageX < imgRect.left || pageX > imgRect.right) return null;
      // CORS / sampling failed: fall back to the image's bottom edge so the
      // curtain still hangs from the crown instead of vanishing entirely.
      if (!contourPixels) {
        return imgRect.bottom - canvasRect.top;
      }
      const ix = Math.min(
        contourW - 1,
        Math.max(0, Math.round(((pageX - imgRect.left) / imgRect.width) * contourW)),
      );
      for (let iy = contourH - 1; iy >= 0; iy--) {
        if (contourPixels[(iy * contourW + ix) * 4 + 3] > ALPHA_THRESHOLD) {
          const pageY = imgRect.top + (iy / contourH) * imgRect.height;
          return pageY - canvasRect.top;
        }
      }
      return null;
    }

    function build() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      // 2x fills retina/phone screens at full res for crisp glyphs; the
      // atlas is rasterized at this scale so small CJK strokes stay sharp.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);

      buildAtlas();
      sampleAvoidRects();

      // pretext measures the true per-glyph advance (no DOM). Use it as the
      // sole source of column spacing so the curtain packs by real CJK width
      // rather than a hardcoded grid. Only fall back to COL_SPACING if the
      // measurement is unavailable, and say so loudly.
      let colStep = COL_SPACING;
      if (prepared) {
        try {
          const stat = measureLineStats(prepared, COL_SPACING);
          if (stat.maxLineWidth > 0) {
            colStep = stat.maxLineWidth;
          } else {
            if (import.meta.env.DEV) {
              console.warn(
                "[TextCurtain] pretext measured zero advance; falling back to COL_SPACING",
              );
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn(
              "[TextCurtain] pretext measurement failed; falling back to COL_SPACING",
              err,
            );
          }
          colStep = COL_SPACING;
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn(
            "[TextCurtain] pretext unavailable; using hardcoded COL_SPACING grid",
          );
        }
      }

      const colCount = Math.max(1, Math.floor(width / colStep));
      const xOffset = (width - (colCount - 1) * colStep) / 2;

      columns = [];
      for (let c = 0; c < colCount; c++) {
        const colX = xOffset + c * colStep;
        const topY = contourYAt(colX);
        // clipped: no roof above this column, no strand hangs here
        if (topY === null) continue;

        // strand starts just under the eave path
        const startY = topY + 6;
        const available = height - startY;
        if (available < ROW_SPACING * 3) continue;

        // organic ragged bottom edge per column
        const lengthJitter = 0.72 + rand(c * 7.3) * 0.28;
        const colRows = Math.max(3, Math.floor((available / ROW_SPACING) * lengthJitter));

        // each column reads down the pool from its own offset, so the curtain
        // looks like continuous vertical prose, not noise
        const charOffset = Math.floor(rand(c * 3.7) * charPool.length);

        const chain: Node[] = [];
        for (let r = 0; r < colRows; r++) {
          const seed = c * 131 + r * 17;
          const homeX = colX + (rand(seed + 3) - 0.5) * 1.6;
          const homeY = startY + r * ROW_SPACING;

          // palette mode paints strands in short vertical runs (~6 chars)
          // so colors read as woven threads, not random noise
          const ink =
            colors && colors.length > 0
              ? colors[Math.floor(rand(c * 13.7 + Math.floor(r / 6) * 5.1) * colors.length)]
              : color;

          const ch = charPool[(charOffset + r) % charPool.length] ?? FALLBACK_CHAR;
          chain.push({
            // start collapsed at the top so the curtain "drops" in
            x: homeX,
            y: startY + r * 1.5,
            px: homeX,
            py: startY + r * 1.5,
            homeX,
            homeY,
            char: ch,
            // uniform ink — every character the same shade
            alpha: inkAlpha,
            visible: rand(seed + 2) > 0.06,
            color: ink,
            cell: atlasMap.get(`${ch}|${ink}`) ?? null,
          });
        }
        columns.push(chain);
      }
    }

    function step(dt: number) {
      // advance the animation clock in real (not frame-count) time so the
      // sway/drop speed is identical on 60Hz and 120Hz displays
      time += dt;
      const r2 = MOUSE_RADIUS * MOUSE_RADIUS;
      // breeze only while the reveal is playing or the user has interacted
      // recently — otherwise strands settle and the loop can stop (perf).
      const breezeActive =
        reveal < 1 || performance.now() - lastInteract < 2500;

      for (let c = 0; c < columns.length; c++) {
        const chain = columns[c];
        // gentle idle breeze, stronger toward the bottom of each strand
        const breeze = breezeActive ? Math.sin(time * 0.7 + c * 0.35) * 0.012 : 0;

        for (let r = 1; r < chain.length; r++) {
          const n = chain[r];
          const depth = r / chain.length;

          // verlet integration
          let vx = (n.x - n.px) * DAMPING;
          let vy = (n.y - n.py) * DAMPING;
          n.px = n.x;
          n.py = n.y;

          // spring back to home (curtain wants to hang straight)
          vx += (n.homeX - n.x) * HOME_STIFFNESS;
          vy += (n.homeY - n.y) * HOME_STIFFNESS;

          // idle sway
          vx += breeze * depth;

          // device-tilt gravity (HTTPS sensor): the curtain leans toward the
          // tilt and swings when the device moves. Scaled by depth so the
          // top (pinned) stays put and the lower strands swing more, like
          // real hanging fabric. Desktop passes {0,0} → no effect.
          vx += gravity.x * GRAVITY_STRENGTH * depth;
          vy += gravity.y * GRAVITY_STRENGTH * depth;

          // cursor gathers the strands like a hand brushing fabric
          if (isBrushing()) {
            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const falloff = (1 - d / MOUSE_RADIUS) ** 2;
              const push = falloff * 1.4;
              vx += (dx / d) * push + mouse.vx * falloff * 0.38;
              vy += (dy / d) * push * 0.3 + mouse.vy * falloff * 0.2;
            }
          }

          n.x += vx;
          n.y += vy;
        }

        // chain constraints: keep strand links at rest length, pinned at top
        for (let it = 0; it < CONSTRAINT_ITERATIONS; it++) {
          for (let r = 1; r < chain.length; r++) {
            const a = chain[r - 1];
            const b = chain[r];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let d = Math.sqrt(dx * dx + dy * dy);
            if (d < 0.0001) {
              d = 0.0001;
              dx = 0;
              dy = 0.0001;
            }
            const diff = (d - ROW_SPACING) / d;
            if (r === 1) {
              // top link pinned to the roof path
              b.x -= dx * diff;
              b.y -= dy * diff;
            } else {
              const ox = dx * diff * 0.5;
              const oy = dy * diff * 0.5;
              a.x += ox;
              a.y += oy;
              b.x -= ox;
              b.y -= oy;
            }
          }
        }
      }

      // decay mouse velocity so pushes feel like a wake
      mouse.vx *= 0.85;
      mouse.vy *= 0.85;
    }

    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      if (reveal <= 0 || !atlas) return;

      const half = atlasCellCss / 2;
      const hasAvoid = avoidRects.length > 0;

      for (let c = 0; c < columns.length; c++) {
        const chain = columns[c];
        for (let r = 0; r < chain.length; r++) {
          const n = chain[r];
          if (!n.visible) continue;

          // fade the strand out toward its ragged bottom edge
          const tail = r / chain.length;
          let edgeFade = tail > 0.75 ? 1 - (tail - 0.75) / 0.25 : 1;

          // fade behind overlapping copy, and during the drop-in reveal
          if (hasAvoid) edgeFade *= avoidFadeAt(n.x, n.y);
          edgeFade *= reveal;

          const cell = n.cell;
          if (!cell) continue;

          // characters align to the strand's actual tangent so a swept strand
          // reads like a curved ribbon of text
          let angle = 0;
          if (r > 0) {
            const p = chain[r - 1];
            const sdx = n.x - p.x;
            const sdy = n.y - p.y;
            angle = Math.atan2(sdx, Math.max(sdy, 0.001)) * -1;
          }

          const a = n.alpha * edgeFade;
          if (a < 0.02) continue;
          ctx!.globalAlpha = a;
          // stamp the pre-rasterized glyph — far cheaper than fillText
          if (angle > 0.06 || angle < -0.06) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ctx!.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * n.x, dpr * n.y);
            ctx!.drawImage(atlas, cell.sx, cell.sy, atlasCell, atlasCell, -half, -half, atlasCellCss, atlasCellCss);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
          } else {
            ctx!.drawImage(atlas, cell.sx, cell.sy, atlasCell, atlasCell, n.x - half, n.y - half, atlasCellCss, atlasCellCss);
          }
        }
      }
      ctx!.globalAlpha = 1;
    }

    function loop() {
      if (!running) return;
      const now = performance.now();
      // clamp dt so a backgrounded tab returning doesn't jump the physics
      const dt = Math.min((now - lastFrame) / 1000, 1 / 30);
      lastFrame = now;
      // hold the physics until the reveal starts so the strands are still
      // collapsed at the eave when they fade in and drop
      if (now >= revealAt) {
        if (reveal < 1) reveal = Math.min(1, reveal + 0.025 * (dt * 60));
        if (!reduceMotion) step(dt);
      }
      draw();
      // reduced-motion: draw the static curtain once, then stop the loop
      if (reduceMotion && reveal >= 1) {
        running = false;
        return;
      }
      // idle-stop: once the reveal has finished and the user isn't brushing,
      // let the curtain settle; when it's still, halt the rAF to save CPU.
      // While device gravity is active we keep running so tilt keeps applying.
      const gravityActive = Math.abs(gravity.x) > 0.001 || Math.abs(gravity.y) > 0.001;
      const idle = reveal >= 1 && !isBrushing() && !gravityActive && performance.now() - lastInteract >= 2500;
      if (idle) {
        let moving = false;
        for (const chain of columns) {
          for (const n of chain) {
            if (Math.abs(n.x - n.px) > 0.02 || Math.abs(n.y - n.py) > 0.02) {
              moving = true;
              break;
            }
          }
          if (moving) break;
        }
        if (!moving) {
          running = false;
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (mouse.active) {
        mouse.vx = mouse.vx * 0.5 + (x - mouse.x) * 0.5;
        mouse.vy = mouse.vy * 0.5 + (y - mouse.y) * 0.5;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
      lastMove = performance.now();
      lastInteract = lastMove;
      // restart the render loop if it was halted while idle
      if (!running && !reduceMotion) {
        running = true;
        lastFrame = performance.now();
        loop();
      }
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
      lastInteract = performance.now();
    }

    /**
     * Wire the contour image: sample its alpha once loaded, and rebuild
     * whenever it finishes loading or the layout changes.
     */
    function initContour() {
      if (!contourSelector) {
        build();
        revealAt = performance.now();
        lastInteract = performance.now();
        return;
      }
      const img = document.querySelector(contourSelector) as HTMLImageElement | null;
      if (img && img.complete && img.naturalWidth > 0) {
        sampleContourImage(img);
        build();
        // let the roof settle before the strands drop from its path
        // (skip the delay under reduced-motion — show the static curtain at once)
        revealAt = reduceMotion ? performance.now() : performance.now() + 380;
        lastInteract = performance.now();
      } else if (img) {
        // nothing renders until the roof has loaded — no flat curtain flash
        img.addEventListener(
          "load",
          () => {
            sampleContourImage(img);
            build();
            revealAt = reduceMotion ? performance.now() : performance.now() + 380;
            lastInteract = performance.now();
          },
          { once: true },
        );
      } else {
        // image not in the DOM yet (mount order) — retry next frame
        requestAnimationFrame(initContour);
      }
    }

    initContour();
    loop();

    const ro = new ResizeObserver(() => {
      if (contourSelector && !contourPixels) return;
      // debounce: dragging the window fires resize continuously; coalesce
      // rebuilds into one per ~150ms so we don't re-measure + re-chain spam
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });
    let resizeTimer = 0 as unknown as ReturnType<typeof setTimeout>;
    ro.observe(canvas);
    // listen on window so strands react even when the cursor is over sibling
    // elements layered above the canvas
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);
    // device-tilt wakes the loop the same way a pointer brush does, so the
    // curtain reacts live while gravity is active (loop may have idle-stopped)
    function onGravityChange() {
      lastInteract = performance.now();
      if (!running && !reduceMotion) {
        running = true;
        lastFrame = performance.now();
        loop();
      }
    }
    gravityBus.addEventListener(GRAVITY_CHANGE, onGravityChange);

    // pause the render loop while the tab is hidden to save battery/CPU
    function onVisibility() {
      if (document.hidden) {
        running = false;
      } else if (!reduceMotion) {
        if (!running) {
          running = true;
          lastFrame = performance.now();
          loop();
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
      gravityBus.removeEventListener(GRAVITY_CHANGE, onGravityChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [charPool, color, colors, inkAlpha, luminous, contourSelector, avoidSelector]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
