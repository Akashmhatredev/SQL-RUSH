import { memo } from "react";
import { cn } from "@/lib/utils";
import { tokenizeSql } from "@/lib/sql-highlight";

/** Syntax-highlighted SQL spans (no wrapper). */
export const SqlHighlight = memo(function SqlHighlight({ code }: { code: string }) {
  return (
    <>
      {tokenizeSql(code).map((t, i) =>
        t.kind === "space" ? (
          t.text
        ) : (
          <span key={i} className={`tok-${t.kind}`}>
            {t.text}
          </span>
        ),
      )}
    </>
  );
});

export function SqlCode({ code, className, inline = false }: { code: string; className?: string; inline?: boolean }) {
  if (inline) {
    return (
      <code className={cn("font-mono text-[0.9em]", className)}>
        <SqlHighlight code={code} />
      </code>
    );
  }
  return (
    <pre
      className={cn(
        "overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-ink-950/70 p-3 font-mono text-[13px] leading-6 sm:p-4 sm:text-sm",
        className,
      )}
    >
      <code>
        <SqlHighlight code={code} />
      </code>
    </pre>
  );
}
