"use client";

import { AnimatePresence, m } from "framer-motion";
import { House, Keyboard, Play, RotateCcw, Timer, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

function formatMs(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Live readout of the run's remaining pause time. */
function PauseClock({ read }: { read: () => number }) {
  const [ms, setMs] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => setMs(read()), 250);
    return () => window.clearInterval(id);
  }, [read]);
  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
      <Timer className="size-3.5" aria-hidden />
      Pause time left this run <span className="font-mono text-slate-200 tabular-nums">{formatMs(ms)}</span>
    </p>
  );
}

export function PauseMenu({
  open,
  onResume,
  onRestart,
  onQuit,
  onShortcuts,
  muted,
  onToggleMute,
  pauseTimeLeft,
}: {
  open: boolean;
  onResume: () => void;
  /** Omitted when the run can't be restarted (the daily challenge). */
  onRestart?: () => void;
  onQuit: () => void;
  onShortcuts: () => void;
  muted: boolean;
  onToggleMute: () => void;
  pauseTimeLeft: () => number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-40 grid place-items-center bg-ink-950/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <m.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Timer stopped</p>
            <h2 id="pause-title" className="text-gradient mt-1 text-4xl font-black">
              Paused
            </h2>
            <PauseClock read={pauseTimeLeft} />
            <div className="mt-6 grid gap-2.5">
              <Button variant="primary" size="lg" onClick={onResume} autoFocus>
                <Play className="size-5 fill-current" aria-hidden /> Resume
                <Kbd className="ml-auto border-ink-950/30 bg-ink-950/20 text-ink-950">P</Kbd>
              </Button>
              {onRestart && (
                <Button onClick={onRestart}>
                  <RotateCcw aria-hidden /> Restart game
                  <Kbd className="ml-auto">R</Kbd>
                </Button>
              )}
              <Button onClick={onToggleMute}>
                {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                {muted ? "Unmute sounds" : "Mute sounds"}
                <Kbd className="ml-auto">M</Kbd>
              </Button>
              <Button onClick={onShortcuts}>
                <Keyboard aria-hidden /> Keyboard shortcuts
                <Kbd className="ml-auto">?</Kbd>
              </Button>
              <Button variant="danger" onClick={onQuit}>
                <House aria-hidden /> End run
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
