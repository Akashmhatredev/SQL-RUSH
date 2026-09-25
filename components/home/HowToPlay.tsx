import { Flame, Heart, ListChecks, Puzzle, Search, SquarePen, Timer, Wrench } from "lucide-react";

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
      <h2 id="how-title" className="mb-3 text-lg font-bold text-white">
        How to play
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {TYPES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass rounded-2xl p-4">
            <Icon className="size-5 text-sky-300" aria-hidden />
            <p className="mt-2 font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
        {RULES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <Icon className="size-5 shrink-0 text-violet-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
