"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Anywhere",
    items: [
      [["M"], "Mute / unmute"],
      [["?"], "Show shortcuts"],
    ],
  },
  {
    title: "Home",
    items: [
      [["Enter"], "Play"],
      [["1", "–", "4"], "Choose difficulty"],
      [["D"], "Start the daily challenge"],
    ],
  },
  {
    title: "In game",
    items: [
      [["Ctrl/⌘", "Enter"], "Submit SQL"],
      [["1", "–", "4"], "Pick an option (or A–D)"],
      [["Enter"], "Submit builder / next question"],
      [["1", "–", "9"], "Add a builder piece"],
      [["Backspace"], "Remove last builder piece"],
      [["←", "→"], "Move a focused builder piece"],
      [["P"], "Pause / resume (or Esc)"],
      [["H"], "Show hint (practice)"],
      [["S"], "Reveal answer (practice)"],
      [["R"], "Restart (paused / game over)"],
    ],
  },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">Keys you can use on the home screen and in game.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                    <span>{label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {keys.map((k, i) =>
                        k === "–" ? (
                          <span key={i} className="text-slate-600">
                            –
                          </span>
                        ) : (
                          <Kbd key={i}>{k}</Kbd>
                        ),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
