import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Device-orientation gravity source for the hanging curtain.
 *
 * Maps phone tilt (beta = front-back, gamma = left-right) to a 2D gravity
 * vector the verlet curtain reads each frame. iOS 13+ requires a user-gesture
 * permission prompt, so `request()` must be called from a click handler.
 *
 * Desktop has no orientation sensor → the vector stays {0,0} and the curtain
 * keeps its existing mouse-brush behaviour (no regression).
 */
export type GravityVec = { x: number; y: number };

type OrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

// tilt-to-gravity mapping constants (kept here, next to the mapping code)
const GAMMA_RANGE = 35; // deg of left/right tilt that maps to full horizontal pull
const BETA_NEUTRAL = 45; // deg of front/back tilt when held naturally
const BETA_RANGE = 35; // deg of deviation from BETA_NEUTRAL that maps to full vertical pull

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Typed, module-scoped channel that tells the curtain render loop a new tilt
// arrived. Using an explicit EventTarget (not a raw `window` "gravitychange"
// string event) keeps the contract between this module and TextCurtain
// compile-checked — a rename breaks the build instead of silently failing.
export const gravityBus = new EventTarget();
export const GRAVITY_CHANGE = "gravitychange";

function dispatchGravityChange() {
  gravityBus.dispatchEvent(new Event(GRAVITY_CHANGE));
}

export function useGravity() {
  // live vector the curtain reads every frame (mutated in place, no re-render)
  const gravity = useRef<GravityVec>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Secure context (HTTPS / localhost) is required for sensors on iOS.
    // Detect support by the event handler property (present on desktop too,
    // even without a sensor) rather than the constructor, which some desktop
    // browsers don't expose — so the toggle still renders and a synthetic or
    // real orientation event drives the curtain either way.
    const hasOrientation =
      typeof window !== "undefined" &&
      (window.isSecureContext ?? false) &&
      ("DeviceOrientationEvent" in window || "ondeviceorientation" in window);
    setSupported(hasOrientation);
  }, []);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // left-right tilt, degrees [-90, 90]
    const beta = e.beta ?? 0; // front-back tilt, degrees [-180, 180]
    // gamma 0 = phone upright → no horizontal pull; tilt left/right swings it.
    gravity.current.x = clamp(gamma / GAMMA_RANGE, -1, 1);
    // beta ~ 45 when held naturally; deviation shifts the vertical bias so the
    // curtain leans as you tilt the device toward/away from you.
    gravity.current.y = clamp((beta - BETA_NEUTRAL) / BETA_RANGE, -1, 1);
    // notify the curtain render loop to wake (mirrors a pointer brush)
    dispatchGravityChange();
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener("deviceorientation", onOrientation);
    gravity.current.x = 0;
    gravity.current.y = 0;
    dispatchGravityChange();
    setActive(false);
  }, [onOrientation]);

  const request = useCallback(async () => {
    if (!supported) return;
    const Ctor = DeviceOrientationEvent as OrientationEventCtor;
    try {
      if (typeof Ctor.requestPermission === "function") {
        const res = await Ctor.requestPermission();
        if (res !== "granted") return;
      }
      window.addEventListener("deviceorientation", onOrientation);
      setActive(true);
    } catch {
      // permission denied or unsupported → stay inactive, no crash
    }
  }, [supported, onOrientation]);

  const toggle = useCallback(() => {
    if (active) stop();
    else void request();
  }, [active, request, stop]);

  // cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { gravity: gravity.current, supported, active, toggle };
}
