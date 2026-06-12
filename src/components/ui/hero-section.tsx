import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared premium hero surface (dashboard hero, editor summary, empty state).
 * `blooms` (default true) paints ambient white aurora glows over the gradient;
 * pass `blooms={false}` for the clean, even gradient used on the About card.
 */
export function HeroSection({
  className,
  children,
  blooms = true,
  ...props
}: ComponentProps<"section"> & { blooms?: boolean }) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl bg-hero p-6 text-white shadow-xl shadow-primary/25 ring-1 ring-white/15 sm:p-7",
        className,
      )}
      {...props}
    >
      {/* ambient blooms for depth */}
      {blooms && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl"
          />
        </>
      )}
      <div className="relative h-full">{children}</div>
    </section>
  );
}
