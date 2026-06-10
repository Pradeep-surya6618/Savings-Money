import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * FuFi (Future Financial) brand mark. Theme-aware so the logo tile always
 * contrasts with the surface: the dark-background mark on light themes, the
 * white-background mark on dark themes. Toggled via CSS (no flash).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-border",
        className,
      )}
    >
      {/* Light theme → dark-background mark */}
      <Image
        src="/Icons/FuFi-Logo-BlackBG.png"
        alt="FuFi"
        fill
        sizes="128px"
        priority
        className="object-contain dark:hidden"
      />
      {/* Dark theme → white-background mark */}
      <Image
        src="/Icons/FuFi-Logo.png"
        alt=""
        aria-hidden
        fill
        sizes="128px"
        className="hidden object-contain dark:block"
      />
    </span>
  );
}
