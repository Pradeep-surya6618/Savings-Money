import Image from "next/image";
import { ReceiptText, PieChart, PiggyBank, Target, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthIllustration } from "./auth-illustration";

const FEATURES = [
  { icon: ReceiptText, label: "Track your salary & expenses" },
  { icon: PieChart, label: "Plan your budget wisely" },
  { icon: PiggyBank, label: "Save more, worry less" },
  { icon: Target, label: "Achieve your financial goals" },
  { icon: Sparkles, label: "Ask FuFi's AI about your money", highlight: true },
];

/**
 * Full-height left brand panel (desktop only) — light mint gradient matching the
 * mockup. Fixed height (no scroll): the illustration flexes into whatever space is
 * left, so content always fits. Always light → explicit dark text colors.
 */
export function BrandPanel({
  title,
  slot = "wallet",
  showFeatures = false,
  showFooter = false,
}: {
  title: string;
  slot?: "wallet" | "shield" | "lock";
  showFeatures?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="relative hidden h-full flex-col overflow-hidden bg-gradient-to-b from-[#eaf9ef] via-[#d8f1e2] to-[#b3e6c6] p-8 lg:flex xl:p-10">
      {/* Brand lockup */}
      <div className="flex shrink-0 items-center gap-3.5">
        <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={112} height={112} priority className="h-28 w-28 object-contain" />
        <div className="leading-none">
          <p className="font-display text-[2.75rem] font-extrabold leading-none tracking-tight">
            <span className="text-[#0b1210]">Fu</span>
            <span className="text-primary">Fi</span>
          </p>
          <p className="mt-2 text-base font-medium text-[#5f7a68]">Fund Your Future</p>
        </div>
      </div>

      {/* Heading + (optional) features */}
      <div className="mt-8 shrink-0 space-y-5">
        <h2 className="text-2xl font-bold leading-snug text-[#0b1210] xl:text-3xl">{title}</h2>
        {showFeatures && (
          <ul className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, label, highlight }) => (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2.5 text-sm",
                  highlight ? "font-semibold text-primary" : "text-[#3f4a44]",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    highlight
                      ? "bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30"
                      : "bg-primary/12 text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Illustration fills the remaining space (keeps the panel from scrolling) */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <AuthIllustration slot={slot} className="h-full max-h-72 w-auto" />
      </div>

      {/* Footer */}
      {showFooter && (
        <p className="flex shrink-0 items-center gap-1.5 text-xs text-[#5f7a68]">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Your data is 100% safe and secure with us.
        </p>
      )}
    </div>
  );
}
