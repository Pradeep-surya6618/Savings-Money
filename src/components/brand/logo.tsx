import { cn } from "@/lib/utils";

/**
 * Surya Savings mark — a sun (Surya = "sun") rendered white on the brand
 * green-gradient badge. Scales to whatever size className you pass (h-/w-).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30 ring-1 ring-white/15",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2.6v2.3" />
          <path d="M12 19.1v2.3" />
          <path d="M2.6 12h2.3" />
          <path d="M19.1 12h2.3" />
          <path d="M5.4 5.4 7 7" />
          <path d="M17 17l1.6 1.6" />
          <path d="M18.6 5.4 17 7" />
          <path d="M7 17l-1.6 1.6" />
        </g>
      </svg>
    </span>
  );
}
