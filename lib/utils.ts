import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about our custom utilities so it never drops them as "conflicts"
// (e.g. `text-gradient` would otherwise be treated as a text colour).
const twMerge = extendTailwindMerge<"text-gradient" | "glass">({
  extend: {
    classGroups: {
      "text-gradient": ["text-gradient"],
      glass: ["glass", "glass-strong"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
