import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared premium gradient hero surface used by the dashboard hero + empty state. */
export function HeroSection({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg",
        className,
      )}
      {...props}
    />
  );
}
