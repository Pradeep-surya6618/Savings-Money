import Image from "next/image";
import { cn } from "@/lib/utils";

/** FuFi (Future Financial) brand mark — served from /public/Icons/FuFi-Logo.png. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5",
        className,
      )}
    >
      <Image
        src="/Icons/FuFi-Logo.png"
        alt="FuFi"
        fill
        sizes="48px"
        className="object-contain"
        priority
      />
    </span>
  );
}
