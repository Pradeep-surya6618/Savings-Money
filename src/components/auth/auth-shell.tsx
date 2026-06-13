import type { ReactNode } from "react";
import Image from "next/image";
import { BrandPanel } from "./brand-panel";

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
          {/* Mobile brand header (the brand panel is desktop-only) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={36} height={36} priority className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-extrabold tracking-tight">FuFi</span>
          </div>
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
