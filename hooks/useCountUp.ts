"use client";

import { useEffect, useRef, useState } from "react";

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a number from its previous value to `value` (requestAnimationFrame, no dependencies). */
export function useCountUp(value: number, { duration = 0.9, from }: { duration?: number; from?: number } = {}) {
  const [display, setDisplay] = useState(from ?? value);
  const current = useRef(from ?? value);

  useEffect(() => {
    const start = current.current;
    if (start === value || prefersReducedMotion()) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / (duration * 1000));
      const v = start + (value - start) * easeOutExpo(t);
      current.current = v;
      setDisplay(v);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return Math.round(display);
}
