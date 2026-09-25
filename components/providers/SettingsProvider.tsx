"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY, type Settings } from "@/lib/storage";

interface SettingsContextValue {
  settings: Settings;
  /** False until localStorage has been read on the client. */
  hydrated: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef(settings);

  useEffect(() => {
    const loaded = loadSettings();
    ref.current = loaded;
    setSettings(loaded);
    setHydrated(true);
    // Keep several open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SETTINGS_KEY) return;
      const next = loadSettings();
      ref.current = next;
      setSettings(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    sound.muted = settings.muted;
  }, [settings.muted]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  const value = useMemo(() => ({ settings, hydrated, updateSettings }), [settings, hydrated, updateSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
