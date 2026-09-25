"use client";

import { useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";
import { sound, type SoundName } from "@/lib/sound";

export function useSound() {
  const { settings, updateSettings } = useSettings();
  const muted = settings.muted;

  const play = useCallback((name: SoundName) => sound.play(name), []);
  const toggleMute = useCallback(() => {
    sound.unlock();
    updateSettings({ muted: !muted });
  }, [muted, updateSettings]);
  const unlock = useCallback(() => sound.unlock(), []);

  return { play, muted, toggleMute, unlock };
}
