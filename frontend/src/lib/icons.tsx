"use client";
import type { LucideIcon } from "lucide-react";
import {
  Sprout, Trees, TreePalm, Leaf, Flower2, Tractor, Wheat, SprayCan, Droplets, Wrench, PlugZap, Hammer, Snowflake, Plug, Smartphone, Flame, Bike,
  Package, Sofa, Truck, Car, BrickWall, PaintRoller, Grid3x3, HardHat, House, PartyPopper, UtensilsCrossed, Sparkles, Monitor, Keyboard, Camera,
  Baby, HeartPulse, Shirt, ChefHat, Bath, Container, Building2, Shovel, Scissors, Nut, Boxes, Briefcase, Brush, Axe, Lightbulb, Drill,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gardening: Sprout,
  cleaning: Brush,
  repair: Wrench,
  farm: Tractor,
  moving: Truck,
  house: House,
  construction: HardHat,
  event: PartyPopper,
  digital: Monitor,
  other: Briefcase,
};

export const SKILL_ICONS: Record<string, LucideIcon> = {
  garden_cleaning: Leaf,
  tree_trimming: Axe,
  coconut_climbing: TreePalm,
  coconut_harvesting: Nut,
  lawn_mowing: Scissors,
  landscaping: Flower2,
  harvesting: Wheat,
  farm_labour: Tractor,
  weeding: Sprout,
  spraying: SprayCan,
  arecanut_harvesting: Trees,
  irrigation_repair: Droplets,
  house_cleaning: Brush,
  deep_cleaning: Sparkles,
  bathroom_cleaning: Bath,
  water_tank_cleaning: Container,
  office_cleaning: Building2,
  cooking: ChefHat,
  house_help: House,
  elderly_care: HeartPulse,
  baby_sitting: Baby,
  laundry: Shirt,
  plumbing: Wrench,
  electrical: PlugZap,
  carpentry: Hammer,
  ac_repair: Snowflake,
  appliance_repair: Plug,
  mobile_repair: Smartphone,
  welding: Flame,
  vehicle_mechanic: Bike,
  loading_unloading: Boxes,
  furniture_moving: Sofa,
  packing: Package,
  delivery_helper: Package,
  driving: Car,
  masonry: BrickWall,
  painting: PaintRoller,
  tiling: Grid3x3,
  construction_helper: Shovel,
  roofing: House,
  event_helper: PartyPopper,
  catering: UtensilsCrossed,
  decoration: Lightbulb,
  computer_basics: Monitor,
  data_entry: Keyboard,
  photography: Camera,
};

export function skillIconFor(id?: string): LucideIcon {
  return (id && SKILL_ICONS[id]) || Drill;
}

export function catIconFor(id?: string): LucideIcon {
  return (id && CATEGORY_ICONS[id]) || Briefcase;
}

const TONES: Record<string, string> = {
  brand: "bg-brand-500/10 text-brand-300 ring-brand-500/20",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  slate: "bg-white/[.04] text-slate-300 ring-white/10",
  sky: "bg-sun-500/10 text-sun-400 ring-sun-500/20",
  rose: "bg-rose-500/10 text-rose-300 ring-rose-500/25",
  violet: "bg-violet-500/10 text-violet-300 ring-violet-500/20",
  white: "bg-white/10 text-white ring-white/15",
};

/** Square icon tile used everywhere instead of emojis. */
export function IconBadge({ icon: Icon, size = 44, tone = "brand", className = "" }: { icon: LucideIcon; size?: number; tone?: string; className?: string }) {
  return (
    <span className={`inline-grid place-items-center shrink-0 rounded-xl ring-1 ring-inset ${TONES[tone] || TONES.brand} ${className}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  );
}

export function SkillBadge({ skill, size = 44, tone = "brand" }: { skill?: string; size?: number; tone?: string }) {
  return <IconBadge icon={skillIconFor(skill)} size={size} tone={tone} />;
}

export function CatBadge({ cat, size = 44, tone = "brand" }: { cat?: string; size?: number; tone?: string }) {
  return <IconBadge icon={catIconFor(cat)} size={size} tone={tone} />;
}

