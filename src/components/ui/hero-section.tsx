import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared premium aurora hero surface (dashboard hero, editor summary, empty state). */
export function HeroSection({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-xl shadow-primary/25 ring-1 ring-white/15 sm:p-7",
        className,
      )}
      {...props}
    >
      {/* ambient blooms for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl"
      />
      <div className="relative">{children}</div>
    </section>
  );
}
