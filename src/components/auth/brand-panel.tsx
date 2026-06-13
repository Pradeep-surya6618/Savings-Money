import Image from "next/image";
import { Check } from "lucide-react";
import { AuthIllustration } from "./auth-illustration";

const FEATURES = [
  "Track your salary & expenses",
  "Plan your budget wisely",
  "Save more, worry less",
  "Achieve your financial goals",
];

/** Full-height left brand panel (desktop only) — green hero gradient + illustration. */
export function BrandPanel({ slot = "wallet" }: { slot?: "wallet" | "shield" | "lock" }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-hero p-10 text-white lg:flex xl:p-14">
      <div className="flex items-center gap-3">
        <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={44} height={44} priority className="h-11 w-11 object-contain" />
        <span className="font-display text-2xl font-extrabold tracking-tight">FuFi</span>
      </div>

      <div className="space-y-7">
        <h2 className="max-w-md text-3xl font-bold leading-tight xl:text-4xl">
          Smart way to manage your salary, savings &amp; future.
        </h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                <Check className="h-3 w-3" />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <AuthIllustration slot={slot} className="mx-auto aspect-[3/5] w-40 xl:w-44" />
      </div>

      <p className="text-xs text-white/70">🔒 Your data is 100% safe and secure with us.</p>
    </div>
  );
}
