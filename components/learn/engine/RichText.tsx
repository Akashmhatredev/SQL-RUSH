import { Fragment, type ReactNode } from "react";
import { SqlHighlight } from "@/components/game/SqlCode";
import { cn } from "@/lib/utils";

/** **bold**, *italic* and `code` inside one line of lesson text. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      out.push(
        <strong key={key} className="font-extrabold text-ink-900">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[0.88em] shadow-[inset_0_-1px_0_rgb(80_60_150/0.14)]"
        >
          <SqlHighlight code={token.slice(1, -1)} />
        </code>,
      );
    } else {
      out.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Lesson text: paragraphs split by a blank line, "- " lines become a bullet list, and inline
 * **bold**, *italic* and `code`.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className={cn("space-y-3 text-[15px] leading-relaxed text-ink-700 sm:text-base", className)}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.trimStart().startsWith("- "))) {
          return (
            <ul key={bi} className="space-y-1.5 pl-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{inline(l.trimStart().slice(2), `${bi}-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Inline-only rich text (no paragraphs), for prompts and labels. */
export function InlineText({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}
