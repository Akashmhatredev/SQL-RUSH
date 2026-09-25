"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TICK_MS = 100;

/**
 * A pausable countdown. `remaining` updates every 100ms; the ring animates
 * between ticks with a CSS transition so rendering stays cheap.
 */
export function useCountdown({
  duration,
  initial,
  running,
  resetKey,
  onExpire,
  onSecond,
}: {
  duration: number;
  /** Seconds left when (re)starting, e.g. a question resumed after a reload. Defaults to `duration`. */
  initial?: number | null;
  running: boolean;
  /** Changing this restarts the countdown from `initial` (or `duration`). */
  resetKey: string | number;
  onExpire: () => void;
  onSecond?: (secondsLeft: number) => void;
}) {
  const start = Math.min(duration, Math.max(0, initial ?? duration));
  const [remaining, setRemaining] = useState(start);
  const remainingRef = useRef(start);
  const lastSecond = useRef(Math.ceil(start));
  const expireRef = useRef(onExpire);
  const secondRef = useRef(onSecond);
  expireRef.current = onExpire;
  secondRef.current = onSecond;

  useEffect(() => {
    remainingRef.current = start;
    lastSecond.current = Math.ceil(start);
    setRemaining(start);
    // `start` is only read when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, resetKey]);

  useEffect(() => {
    if (!running) return;
    if (remainingRef.current <= 0) {
      // Resumed with no time left (or a failed submit being retried): expire straight away.
      expireRef.current();
      return;
    }
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const next = Math.max(0, remainingRef.current - (now - last) / 1000);
      last = now;
      remainingRef.current = next;
      setRemaining(next);
      const whole = Math.ceil(next);
      if (whole < lastSecond.current) {
        lastSecond.current = whole;
        secondRef.current?.(whole);
      }
      if (next <= 0) {
        window.clearInterval(id);
        expireRef.current();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, resetKey]);

  const read = useCallback(() => remainingRef.current, []);

  return { remaining, read };
}
