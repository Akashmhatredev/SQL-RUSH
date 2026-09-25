"use client";

import { m } from "framer-motion";
import { GripVertical, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "@/hooks/useHotkeys";
import { cn } from "@/lib/utils";
import type { PoolToken } from "@/types/game";
import { SqlHighlight } from "./SqlCode";

interface DragState {
  key: string;
  from: "pool" | "answer";
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  /** Insertion index in the answer, or null when not over the answer area. */
  insertAt: number | null;
  overPool: boolean;
}

interface Pending {
  key: string;
  from: "pool" | "answer";
  startX: number;
  startY: number;
  rect: DOMRect;
}

const DRAG_THRESHOLD = 6;

/**
 * Query builder: tap tokens to add/remove them, or drag to place and reorder
 * (mouse and touch). Keyboard: 1–9 add tokens, Backspace removes the last one,
 * ←/→ move a focused token.
 */
export function DragDropBuilder({
  pool,
  placed,
  onChange,
  locked,
  expected,
}: {
  pool: PoolToken[];
  placed: string[];
  onChange: (keys: string[]) => void;
  locked: boolean;
  /** Correct token texts, shown as colouring after answering. */
  expected: string[] | null;
}) {
  const byKey = useMemo(() => new Map(pool.map((t) => [t.key, t])), [pool]);
  const available = pool.filter((t) => !placed.includes(t.key));
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<Pending | null>(null);
  const suppressClick = useRef(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const focusKey = useRef<string | null>(null);

  const add = useCallback((key: string) => onChange([...placed, key]), [placed, onChange]);
  const remove = useCallback((key: string) => onChange(placed.filter((k) => k !== key)), [placed, onChange]);

  const move = (key: string, delta: number) => {
    const i = placed.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= placed.length) return;
    const next = [...placed];
    [next[i], next[j]] = [next[j], next[i]];
    focusKey.current = key;
    onChange(next);
  };

  // Restore focus to a token after keyboard reordering re-renders it.
  useEffect(() => {
    if (!focusKey.current) return;
    const el = answerRef.current?.querySelector<HTMLElement>(`[data-token-key="${focusKey.current}"]`);
    el?.focus();
    focusKey.current = null;
  }, [placed]);

  useHotkeys(
    {
      Backspace: (e) => {
        if (!placed.length) return;
        e.preventDefault();
        onChange(placed.slice(0, -1));
      },
      ...Object.fromEntries(
        available.slice(0, 9).map((t, i) => [
          String(i + 1),
          (e: KeyboardEvent) => {
            e.preventDefault();
            add(t.key);
          },
        ]),
      ),
    },
    { enabled: !locked },
  );

  const hitTest = (x: number, y: number): Pick<DragState, "insertAt" | "overPool"> => {
    const els = document.elementsFromPoint(x, y);
    const slot = els.find((el) => el instanceof HTMLElement && el.dataset.slotIndex !== undefined) as
      HTMLElement | undefined;
    if (slot) {
      const index = Number(slot.dataset.slotIndex);
      const rect = slot.getBoundingClientRect();
      return { insertAt: x < rect.left + rect.width / 2 ? index : index + 1, overPool: false };
    }
    if (els.some((el) => el instanceof HTMLElement && el.dataset.dropzone === "answer")) {
      // Past the last token on a row → append, before the first → prepend.
      const tokens = Array.from(answerRef.current?.querySelectorAll<HTMLElement>("[data-slot-index]") ?? []);
      let insertAt = tokens.length;
      for (const [i, el] of tokens.entries()) {
        const r = el.getBoundingClientRect();
        if (y < r.top) {
          insertAt = i;
          break;
        }
        if (y <= r.bottom && x < r.left + r.width / 2) {
          insertAt = i;
          break;
        }
      }
      return { insertAt, overPool: false };
    }
    const overPool = els.some((el) => el instanceof HTMLElement && el.dataset.dropzone === "pool");
    return { insertAt: null, overPool };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, key: string, from: "pool" | "answer") => {
    if (locked || e.button !== 0) return;
    pending.current = {
      key,
      from,
      startX: e.clientX,
      startY: e.clientY,
      rect: e.currentTarget.getBoundingClientRect(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = pending.current;
    if (!p) return;
    if (!drag) {
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD) return;
      setDrag({
        key: p.key,
        from: p.from,
        x: e.clientX,
        y: e.clientY,
        offsetX: p.startX - p.rect.left,
        offsetY: p.startY - p.rect.top,
        width: p.rect.width,
        ...hitTest(e.clientX, e.clientY),
      });
      return;
    }
    setDrag({ ...drag, x: e.clientX, y: e.clientY, ...hitTest(e.clientX, e.clientY) });
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Don't leave focus on a token after mouse/touch use, so Enter submits instead of toggling it.
    e.currentTarget.blur();
    pending.current = null;
    if (!drag) return;
    suppressClick.current = true;
    const { key, from, insertAt, overPool } = drag;
    setDrag(null);
    if (insertAt !== null) {
      const without = placed.filter((k) => k !== key);
      const oldIndex = placed.indexOf(key);
      const target = from === "answer" && oldIndex >= 0 && oldIndex < insertAt ? insertAt - 1 : insertAt;
      without.splice(Math.max(0, Math.min(target, without.length)), 0, key);
      onChange(without);
    } else if (overPool && from === "answer") {
      remove(key);
    }
  };

  const onClick = (key: string, from: "pool" | "answer") => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (locked) return;
    if (from === "pool") add(key);
    else remove(key);
  };

  const tokenClass =
    "relative inline-flex max-w-full touch-none select-none items-center gap-1 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[13px] leading-5 transition-colors sm:text-sm";

  const dragged = drag ? byKey.get(drag.key) : null;

  return (
    <div className="space-y-3">
      <div
        ref={answerRef}
        data-dropzone="answer"
        className={cn(
          "min-h-24 rounded-xl border border-dashed p-3 transition-colors",
          drag?.insertAt != null ? "border-sky-400/70 bg-sky-400/[0.06]" : "border-white/15 bg-ink-950/60",
        )}
        aria-label="Your query"
      >
        {placed.length === 0 && !drag && (
          <p className="pointer-events-none py-6 text-center text-sm text-slate-500">
            Tap or drag the pieces below to build the query
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {placed.map((key, i) => {
            const token = byKey.get(key);
            if (!token) return null;
            const state = expected ? (expected[i] === token.text ? "right" : "wrong") : "idle";
            return (
              <div key={key} className="contents">
                {drag?.insertAt === i && <InsertMarker />}
                <m.button
                  layout
                  transition={{ layout: { duration: 0.18 } }}
                  type="button"
                  data-slot-index={i}
                  data-token-key={key}
                  onPointerDown={(e) => onPointerDown(e, key, "answer")}
                  onPointerMove={onPointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onClick={() => onClick(key, "answer")}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      move(key, -1);
                    } else if (e.key === "ArrowRight") {
                      e.preventDefault();
                      move(key, 1);
                    }
                  }}
                  disabled={locked}
                  aria-label={`${token.text}, position ${i + 1}. Press to remove, arrow keys to move.`}
                  className={cn(
                    tokenClass,
                    state === "idle" && "border-sky-400/40 bg-sky-400/10 hover:border-sky-300",
                    state === "right" && "border-emerald-400/60 bg-emerald-400/15",
                    state === "wrong" && "border-rose-400/60 bg-rose-500/15",
                    drag?.key === key && "opacity-30",
                  )}
                >
                  <span className="min-w-0 whitespace-pre-wrap break-words">
                    <SqlHighlight code={token.text} />
                  </span>
                </m.button>
              </div>
            );
          })}
          {drag?.insertAt === placed.length && placed.length > 0 && <InsertMarker />}
        </div>
      </div>

      <div
        data-dropzone="pool"
        className={cn(
          "rounded-xl border p-3 transition-colors",
          drag?.overPool && drag.from === "answer"
            ? "border-rose-400/50 bg-rose-500/[0.05]"
            : "border-white/5 bg-white/[0.02]",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pieces</p>
          {placed.length > 0 && !locked && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex min-h-10 flex-wrap gap-2">
          {available.map((token, i) => (
            <m.button
              layout
              transition={{ layout: { duration: 0.18 } }}
              key={token.key}
              type="button"
              onPointerDown={(e) => onPointerDown(e, token.key, "pool")}
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onClick={() => onClick(token.key, "pool")}
              disabled={locked}
              aria-label={`Add ${token.text}`}
              className={cn(
                tokenClass,
                "border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-violet-400/60 hover:bg-violet-400/10",
                drag?.key === token.key && "opacity-30",
                locked && expected && !expected.includes(token.text) && "opacity-40",
              )}
            >
              {i < 9 && !locked && (
                <span className="mr-0.5 hidden font-sans text-[10px] text-slate-500 sm:inline">{i + 1}</span>
              )}
              <span className="min-w-0 whitespace-pre-wrap break-words">
                <SqlHighlight code={token.text} />
              </span>
            </m.button>
          ))}
          {available.length === 0 && <p className="text-xs text-slate-600">All pieces placed.</p>}
        </div>
      </div>

      {drag && dragged && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{
            transform: `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`,
            width: drag.width,
          }}
        >
          <div
            className={cn(
              tokenClass,
              "w-full rotate-2 border-sky-300 bg-ink-800 shadow-[0_12px_40px_-8px_rgba(60,201,255,0.7)]",
            )}
          >
            <GripVertical className="size-3.5 shrink-0 text-slate-500" />
            <span className="min-w-0 whitespace-pre-wrap break-words">
              <SqlHighlight code={dragged.text} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function InsertMarker() {
  return <span className="h-7 w-1 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]" />;
}
