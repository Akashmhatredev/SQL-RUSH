"use client";

import { useReducedMotion } from "framer-motion";
import { createContext, useContext } from "react";

/** Playback speed shared by every animated piece inside one visualizer. */
export const AnimationSpeedContext = createContext(1);

/**
 * Durations (seconds) for the current speed. With reduced motion, movement is instant and
 * row-by-row reveals happen together, so nothing waits on an animation to be readable.
 */
export function useAnimationTiming() {
  const speed = useContext(AnimationSpeedContext);
  const reduced = useReducedMotion() ?? false;
  const k = reduced ? 0 : 1 / speed;
  return {
    reduced,
    speed,
    /** Rows gliding to a new place. */
    layout: 0.55 * k,
    /** Fades and tints. */
    fade: reduced ? 0.12 : 0.3 / speed,
    /** Gap between rows in a row-by-row reveal. */
    stagger: 0.26 * k,
  };
}
