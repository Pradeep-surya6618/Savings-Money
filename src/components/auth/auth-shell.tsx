import type { ReactNode } from "react";
import Image from "next/image";
import { BrandPanel } from "./brand-panel";

/** Full-screen auth layout: left brand panel (lg+) + right form half (full height). */
export function AuthShell({
  slot = "wallet",
  children,
}: {
  slot?: "wallet" | "shield" | "lock";
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel slot={slot} />
      <div className="flex flex-col items-center justify-center bg-background px-6 py-10 sm:px-10">
        {/* Mobile brand header (the brand panel is desktop-only) */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Image src="/Icons/FuFi-Logo-Transperent.png" alt="FuFi" width={36} height={36} priority className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-extrabold tracking-tight">FuFi</span>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
