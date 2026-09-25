"use client";

import { useEffect, useRef } from "react";

export type HotkeyHandler = (e: KeyboardEvent) => void;

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Global keyboard shortcuts. Keys are matched against `event.key` (case-insensitive
 * for letters). Shortcuts are ignored while typing unless `allowInInputs` lists the key.
 */
export function useHotkeys(
  bindings: Record<string, HotkeyHandler>,
  { enabled = true, allowInInputs = [] as string[] } = {},
) {
  const ref = useRef(bindings);
  ref.current = bindings;
  const allowRef = useRef(allowInInputs);
  allowRef.current = allowInInputs;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const combo = `${e.ctrlKey || e.metaKey ? "mod+" : ""}${key}`;
      const handler = ref.current[combo] ?? (e.ctrlKey || e.metaKey || e.altKey ? undefined : ref.current[key]);
      if (!handler) return;
      if (isTypingTarget(e.target) && !allowRef.current.includes(combo)) return;
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
