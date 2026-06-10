import {
  Bus,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "./categories";

export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  family: HeartHandshake,
  loan: GraduationCap,
  food: UtensilsCrossed,
  recharge: Smartphone,
  transport: Bus,
  shopping: ShoppingBag,
  savings: PiggyBank,
  investments: TrendingUp,
  emergency: ShieldCheck,
  misc: MoreHorizontal,
};
