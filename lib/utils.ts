import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about our custom utilities so it never drops them as "conflicts"
// (e.g. `text-gradient` would otherwise be treated as a text colour, and `shadow-clay-*` as a shadow colour).
const twMerge = extendTailwindMerge<"text-gradient" | "clay">({
  extend: {
    theme: {
      shadow: ["clay-sm", "clay", "clay-lg", "clay-btn", "clay-pressed", "clay-inset"],
    },
    classGroups: {
      "text-gradient": ["text-gradient"],
      clay: ["clay", "clay-strong", "clay-inset"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
