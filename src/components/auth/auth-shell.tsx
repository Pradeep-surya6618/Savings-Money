import type { ReactNode } from "react";
import Image from "next/image";
import { BrandPanel } from "./brand-panel";
import { AuthIllustration } from "./auth-illustration";

/** Full-screen auth layout: left brand panel (lg+) + right form half (full height). */
export function AuthShell({
  title,
  slot = "wallet",
  showFeatures = false,
  showFooter = false,
  children,
}: {
  title: string;
  slot?: "wallet" | "shield" | "lock";
  showFeatures?: boolean;
  showFooter?: boolean;
  children: ReactNode;
}) {
  return (
    // Fixed to the viewport — the window itself never scrolls; only a column
    // scrolls internally (via min-h-full + justify-center) if its content is tall.
    <div className="grid h-dvh overflow-hidden lg:grid-cols-[4fr_8fr]">
      <BrandPanel title={title} slot={slot} showFeatures={showFeatures} showFooter={showFooter} />
      <div className="overflow-y-auto bg-background">
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 sm:px-10">
          {/* Mobile brand header (the brand panel is desktop-only): logo + name + illustration */}
          <div className="mb-8 flex w-full max-w-md flex-col items-center rounded-3xl bg-gradient-to-b from-[#eaf9ef] to-[#cdeed9] px-6 pb-3 pt-6 lg:hidden">
            <div className="flex items-center gap-3">
              <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={56} height={56} priority className="h-14 w-14 object-contain" />
              <div className="leading-none">
                <p className="font-display text-3xl font-extrabold tracking-tight">
                  <span className="text-[#0b1210]">Fu</span>
                  <span className="text-primary">Fi</span>
                </p>
                <p className="mt-1.5 text-xs font-medium text-[#5f7a68]">Fund Your Future</p>
              </div>
            </div>
            <AuthIllustration slot={slot} className="mt-4 h-36 w-auto" />
          </div>
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
