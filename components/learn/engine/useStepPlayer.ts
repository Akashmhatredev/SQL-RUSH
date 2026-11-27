"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

export const SPEEDS = [0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export interface StepPlayer {
  index: number;
  count: number;
  playing: boolean;
  speed: Speed;
  atEnd: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  /** Back to the first step and play again. */
  replay: () => void;
  /** Back to the first step, paused. */
  reset: () => void;
  /** Jump straight to the last step (the result). */
  skip: () => void;
  goTo: (index: number) => void;
  setSpeed: (speed: Speed) => void;
}

/**
 * Drives a step-by-step animation. Autoplay waits each step's own duration (scaled by speed)
 * before moving on and stops at the last step. Starts paused so the learner sets the pace.
 */
export function useStepPlayer(
  durations: number[],
  { autoPlay = false, resetKey }: { autoPlay?: boolean; resetKey?: unknown } = {},
): StepPlayer {
  const count = durations.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<Speed>(1);
  const reduced = useReducedMotion();
  const timer = useRef<number | null>(null);

  // A new query (or lesson step) starts again from the top.
  useEffect(() => {
    setIndex(0);
    setPlaying(autoPlay);
  }, [resetKey, autoPlay]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!playing) return;
    if (index >= count - 1) {
      setPlaying(false);
      return;
    }
    // With reduced motion there's nothing to watch mid-step, so read time is what matters.
    const ms = (durations[index] ?? 1500) / speed + (reduced ? 600 : 0);
    timer.current = window.setTimeout(() => setIndex((i) => Math.min(i + 1, count - 1)), ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, index, count, durations, speed, reduced]);

  const play = useCallback(() => {
    setIndex((i) => (i >= count - 1 ? 0 : i));
    setPlaying(true);
  }, [count]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(i + 1, count - 1));
  }, [count]);
  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const replay = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);
  const reset = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);
  const skip = useCallback(() => {
    setPlaying(false);
    setIndex(count - 1);
  }, [count]);
  const goTo = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(i, count - 1)));
    },
    [count],
  );

  return {
    index: Math.min(index, Math.max(0, count - 1)),
    count,
    playing,
    speed,
    atEnd: index >= count - 1,
    play,
    pause,
    toggle,
    next,
    prev,
    replay,
    reset,
    skip,
    goTo,
    setSpeed,
  };
}
