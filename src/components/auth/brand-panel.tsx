import Image from "next/image";
import { Check, ShieldCheck } from "lucide-react";
import { AuthIllustration } from "./auth-illustration";

const FEATURES = [
  "Track your salary & expenses",
  "Plan your budget wisely",
  "Save more, worry less",
  "Achieve your financial goals",
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
    <div className="relative hidden h-full flex-col overflow-hidden bg-gradient-to-b from-[#e8f7ee] via-[#eef9f2] to-[#ddf2e6] p-8 lg:flex xl:p-10">
      {/* Brand lockup */}
      <div className="flex shrink-0 items-center gap-2.5">
        <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={40} height={40} priority className="h-10 w-10 object-contain" />
        <div className="leading-none">
          <p className="font-display text-xl font-extrabold tracking-tight">
            <span className="text-[#0b1210]">Fu</span>
            <span className="text-primary">Fi</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#5f7a68]">Fund Your Future</p>
        </div>
      </div>

      {/* Heading + (optional) features */}
      <div className="mt-8 shrink-0 space-y-5">
        <h2 className="text-2xl font-bold leading-snug text-[#0b1210] xl:text-3xl">{title}</h2>
        {showFeatures && (
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[#3f4a44]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {f}
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
