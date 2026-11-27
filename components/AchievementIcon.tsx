import {
  ArrowDownUp,
  Brain,
  CalendarCheck,
  Crown,
  Database,
  Flame,
  Footprints,
  Funnel,
  Gem,
  GraduationCap,
  Link2,
  Medal,
  Rocket,
  ShieldCheck,
  Sigma,
  Sparkles,
  Star,
  Table2,
  Target,
  Timer,
  Trophy,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AchievementIconName } from "@/lib/achievements";

const ICONS: Record<AchievementIconName, LucideIcon> = {
  sparkles: Sparkles,
  target: Target,
  medal: Medal,
  trophy: Trophy,
  shield: ShieldCheck,
  zap: Zap,
  wand: WandSparkles,
  flame: Flame,
  calendar: CalendarCheck,
  crown: Crown,
  gem: Gem,
  rocket: Rocket,
  star: Star,
  timer: Timer,
  brain: Brain,
  database: Database,
  footprints: Footprints,
  table: Table2,
  filter: Funnel,
  sort: ArrowDownUp,
  sigma: Sigma,
  link: Link2,
  graduation: GraduationCap,
};

/** Achievement icons are stored as names in the database; unknown names fall back to a trophy. */
export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as AchievementIconName] ?? Trophy;
  return <Icon className={className} aria-hidden />;
}
