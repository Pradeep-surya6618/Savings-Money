import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-brand text-white shadow-sm",
  ghost: "text-foreground hover:bg-card-elevated",
  outline: "border border-border text-foreground hover:bg-card-elevated",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
