import { Flame, Heart, ListChecks, Puzzle, Search, SquarePen, Timer, Wrench } from "lucide-react";

/** Pastel icon chips, cycled across the cards. */
const CHIPS = [
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
  "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600",
  "bg-pink-100 text-pink-600",
];

const TYPES = [
  {
    icon: SquarePen,
    title: "Write SQL",
    text: "Type the query from scratch. Case, spacing and semicolons don't matter.",
  },
  { icon: ListChecks, title: "Multiple choice", text: "Four options, one right answer. Press 1–4 to answer fast." },
  { icon: Wrench, title: "Fix the query", text: "A broken query is pre-filled. Find the bug and repair it." },
  { icon: Search, title: "Predict output", text: "Read the query and the sample table, then choose the result." },
  { icon: Puzzle, title: "Query builder", text: "Drag the pieces into order. Watch out for decoys." },
];

const RULES = [
  {
    icon: Timer,
    title: "Beat the timer",
    text: "30s on Easy up to 90s on Expert. Leftover seconds become bonus points.",
  },
  { icon: Flame, title: "Build combos", text: "3 in a row ×2, 5 in a row ×3, 10 in a row ×5." },
  {
    icon: Heart,
    title: "Three lives",
    text: "Each wrong answer or timeout costs a heart. Lose all three and it's game over.",
  },
];

export function HowToPlay() {
  return (
    <section className="mt-12" aria-labelledby="how-title">
      <h2 id="how-title" className="mb-3 text-lg font-extrabold text-ink-900">
        How to play
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {TYPES.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="clay rounded-3xl p-4">
            <span className={`grid size-10 place-items-center rounded-2xl shadow-clay-sm ${CHIPS[i % CHIPS.length]}`}>
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 font-extrabold text-ink-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
        {RULES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-3xl bg-white/45 p-4 shadow-clay-pressed">
            <Icon className="size-5 shrink-0 text-violet-600" aria-hidden />
            <div>
              <p className="text-sm font-extrabold text-ink-900">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
