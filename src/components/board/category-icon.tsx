import {
  Briefcase,
  Factory,
  GraduationCap,
  Handshake,
  HardHat,
  HeartPulse,
  Laptop,
  type LucideIcon,
  Package,
  Palette,
  Scissors,
  ShoppingBag,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/master-data";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Handshake,
  ShoppingBag,
  UtensilsCrossed,
  Laptop,
  Palette,
  Factory,
  Truck,
  HardHat,
  HeartPulse,
  GraduationCap,
  Scissors,
  Package,
  Sparkles,
};

export const TONE_BG = {
  sun: "bg-sun",
  coral: "bg-coral",
  mint: "bg-mint",
  sky: "bg-sky-pop",
  lilac: "bg-lilac",
} as const;

function meta(category: string | null | undefined) {
  return JOB_CATEGORIES[
    (category && category in JOB_CATEGORIES ? category : "OTHER") as JobCategory
  ];
}

export function CategoryIcon({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  const Icon = ICONS[meta(category).icon] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

/** 職種のチップ（色とアイコンで見分けやすく。色だけに頼らず文字も出す） */
export function CategoryChip({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  const m = meta(category);
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border-2 border-ink px-2.5 text-xs font-bold text-[#1e1b2e]",
        TONE_BG[m.tone],
        className,
      )}
    >
      <CategoryIcon category={category} className="size-3.5" />
      {m.label}
    </span>
  );
}
