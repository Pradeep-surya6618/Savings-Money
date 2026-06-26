import {
  Car,
  GraduationCap,
  Home,
  Landmark,
  Smartphone,
  Sprout,
  Wallet,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

export const LOAN_TYPES = [
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "vehicle", label: "Vehicle", icon: Car },
  { key: "home", label: "Home", icon: Home },
  { key: "mobile", label: "Mobile / Gadget", icon: Smartphone },
  { key: "agriculture", label: "Agriculture", icon: Sprout },
  { key: "appliances", label: "Appliances", icon: WashingMachine },
  { key: "personal", label: "Personal", icon: Wallet },
  { key: "other", label: "Other", icon: Landmark },
] as const satisfies readonly { key: string; label: string; icon: LucideIcon }[];

export type LoanTypeKey = (typeof LOAN_TYPES)[number]["key"];

export const LOAN_TYPE_KEYS = LOAN_TYPES.map((t) => t.key) as [LoanTypeKey, ...LoanTypeKey[]];

export const LOAN_TYPE_MAP = Object.fromEntries(LOAN_TYPES.map((t) => [t.key, t])) as Record<
  LoanTypeKey,
  (typeof LOAN_TYPES)[number]
>;

export function loanTypeLabel(key: string): string {
  return LOAN_TYPE_MAP[key as LoanTypeKey]?.label ?? "Other";
}
