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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function useGravity() {
  // live vector the curtain reads every frame (mutated in place, no re-render)
  const gravity = useRef<GravityVec>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Secure context (HTTPS / localhost) is required for sensors on iOS.
    const hasOrientation =
      typeof window !== "undefined" &&
      typeof DeviceOrientationEvent !== "undefined" &&
      (window.isSecureContext ?? false);
    setSupported(hasOrientation);
  }, []);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // left-right tilt, degrees [-90, 90]
    const beta = e.beta ?? 0; // front-back tilt, degrees [-180, 180]
    // gamma 0 = phone upright → no horizontal pull; tilt left/right swings it.
    gravity.current.x = clamp(gamma / 35, -1, 1);
    // beta ~ 45 when held naturally; deviation shifts the vertical bias so the
    // curtain leans as you tilt the device toward/away from you.
    gravity.current.y = clamp((beta - 45) / 35, -1, 1);
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener("deviceorientation", onOrientation);
    gravity.current.x = 0;
    gravity.current.y = 0;
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
