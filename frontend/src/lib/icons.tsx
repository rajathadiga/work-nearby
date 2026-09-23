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
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  white: "bg-white/15 text-white ring-white/20",
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

