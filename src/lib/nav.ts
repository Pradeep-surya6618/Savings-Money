import {
  ArrowLeftRight,
  BarChart3,
  Coins,
  GraduationCap,
  Home,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; color: string };

/** Accent colors for the trackers — the single source of truth shared by the
 *  secondary nav, the tracker pages, and the dashboard cards. */
export const SAVINGS_COLOR = "#14b8a6"; // teal
export const LOAN_COLOR = "#ec4899"; // pink
export const BALANCE_COLOR = "#f59e0b"; // amber

/** Primary nav — the core destinations, shown first in both navs. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home, color: "#16a34a" },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, color: "#3b82f6" },
  { href: "/budget", label: "Budget", icon: Wallet, color: "#f59e0b" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, color: "#8b5cf6" },
];

/** Secondary nav — sidebar only; reached on mobile via dashboard cards / the "More" sheet. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/savings", label: "Savings", icon: PiggyBank, color: SAVINGS_COLOR },
  { href: "/loan", label: "Loan", icon: GraduationCap, color: LOAN_COLOR },
  { href: "/balance", label: "Balance", icon: Coins, color: BALANCE_COLOR },
];

/** Settings — always pinned last in both the sidebar and the bottom tab bar. */
export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  color: "#64748b",
};

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
