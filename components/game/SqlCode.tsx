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
        "clay-inset overflow-x-auto whitespace-pre-wrap break-words rounded-2xl p-3 font-mono text-[13px] leading-6 text-ink-900 sm:p-4 sm:text-sm",
        className,
      )}
    >
      <code>
        <SqlHighlight code={code} />
      </code>
    </pre>
  );
}
