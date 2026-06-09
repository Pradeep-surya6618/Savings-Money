import {
  ArrowLeftRight,
  BarChart3,
  GraduationCap,
  Home,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Primary nav — these 5 appear in the mobile bottom tab bar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Secondary nav — sidebar only; reached on mobile via dashboard cards. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/loan", label: "Loan", icon: GraduationCap },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
