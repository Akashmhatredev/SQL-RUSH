"use client";

import { AnimatePresence, m } from "framer-motion";
import { Heart, Infinity as InfinityIcon } from "lucide-react";
import { STARTING_LIVES } from "@/lib/config";

export function Lives({ lives, unlimited }: { lives: number; unlimited?: boolean }) {
  if (unlimited) {
    return (
      <div className="flex items-center gap-1 text-rose-500" aria-label="Unlimited lives">
        <Heart className="size-5 fill-rose-500 text-rose-500 drop-shadow-[1px_2px_0_rgb(255_255_255)]" aria-hidden />
        <InfinityIcon className="size-4" aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1" aria-label={`${lives} of ${STARTING_LIVES} lives left`} role="img">
      {Array.from({ length: STARTING_LIVES }, (_, i) => {
        const alive = i < lives;
        return (
          <div key={i} className="relative size-5 sm:size-6">
            <Heart className="absolute inset-0 size-full fill-ink-100 text-ink-300" aria-hidden />
            <AnimatePresence>
              {alive && (
                <m.span
                  className="absolute inset-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: [1, 1.6, 0], rotate: [0, -20, 25], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart
                    className="size-full fill-rose-500 text-rose-500 drop-shadow-[1px_2px_0_rgb(255_255_255)]"
                    aria-hidden
                  />
                </m.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
