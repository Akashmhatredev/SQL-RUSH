"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SqlHighlight } from "./SqlCode";

export interface SqlEditorHandle {
  focus: () => void;
}

/**
 * A lightweight SQL editor: a transparent <textarea> layered over a
 * syntax-highlighted <pre> with identical metrics. Auto-grows with content.
 */
export const SqlEditor = forwardRef<
  SqlEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
    label: string;
    state?: "idle" | "correct" | "wrong";
  }
>(function SqlEditor({ value, onChange, onSubmit, disabled, placeholder, autoFocus, label, state = "idle" }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  useLayoutEffect(resize, [value, resize]);

  useEffect(() => {
    if (!autoFocus) return;
    // Only grab focus with a mouse/trackpad so phones don't pop the keyboard over the question.
    if (window.matchMedia("(pointer: fine)").matches) {
      const ta = textareaRef.current;
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, [autoFocus]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-ink-950/80 transition-colors",
        state === "idle" &&
          "border-white/10 focus-within:border-sky-400/60 focus-within:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]",
        state === "correct" && "border-emerald-400/60",
        state === "wrong" && "border-rose-400/60",
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
        <span className="size-2.5 rounded-full bg-rose-400/70" />
        <span className="size-2.5 rounded-full bg-amber-300/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-[11px] text-slate-500">query.sql</span>
      </div>
      <div className="relative">
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words p-3 font-mono text-[16px] leading-6 sm:p-4 sm:text-[15px]"
        >
          {value ? <SqlHighlight code={value + "\n"} /> : <span className="text-slate-600">{placeholder}</span>}
        </pre>
        <textarea
          ref={textareaRef}
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          rows={4}
          className="relative block min-h-32 w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-[16px] leading-6 text-transparent caret-sky-300 outline-none selection:bg-sky-400/30 disabled:cursor-not-allowed sm:p-4 sm:text-[15px]"
        />
      </div>
    </div>
  );
});
