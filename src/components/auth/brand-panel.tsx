import Image from "next/image";
import { SquareCheckBig, ShieldCheck } from "lucide-react";
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
    <div className="relative hidden h-full flex-col overflow-hidden bg-gradient-to-b from-[#eaf9ef] via-[#d8f1e2] to-[#b3e6c6] p-8 lg:flex xl:p-10">
      {/* Brand lockup */}
      <div className="flex shrink-0 items-center gap-3.5">
        <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={96} height={96} priority className="h-24 w-24 object-contain" />
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
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[#3f4a44]">
                <SquareCheckBig className="h-5 w-5 shrink-0 text-primary" />
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
