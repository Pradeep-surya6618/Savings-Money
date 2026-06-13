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
 * mockup. The white-background FuFi-PNG illustration is composited with
 * mix-blend-multiply so its background disappears onto the mint. Always light, so
 * it uses explicit dark text colors (independent of the app theme).
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
    <div className="relative hidden flex-col justify-between gap-6 overflow-y-auto bg-gradient-to-b from-[#e8f7ee] via-[#eef9f2] to-[#ddf2e6] p-8 lg:flex xl:p-12">
      {/* Brand lockup */}
      <div className="flex items-center gap-2.5">
        <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={40} height={40} priority className="h-10 w-10 object-contain" />
        <div className="leading-none">
          <p className="font-display text-xl font-extrabold tracking-tight">
            <span className="text-[#0b1210]">Fu</span>
            <span className="text-primary">Fi</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#5f7a68]">Fund Your Future</p>
        </div>
      </div>

      {/* Heading + (optional) features + illustration */}
      <div className="space-y-6">
        <h2 className="max-w-md text-2xl font-bold leading-snug text-[#0b1210] xl:text-3xl">{title}</h2>
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
        <AuthIllustration slot={slot} className="mx-auto aspect-[3/5] w-44 mix-blend-multiply xl:w-52" />
      </div>

      {/* Footer */}
      {showFooter ? (
        <p className="flex items-center gap-1.5 text-xs text-[#5f7a68]">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Your data is 100% safe and secure with us.
        </p>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}
