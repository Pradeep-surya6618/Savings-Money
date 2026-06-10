import { cn } from "@/lib/utils";

/** FuFi logotype — "Fu" (Future) in foreground, "Fi" (Financial) in the brand gradient. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-extrabold leading-none tracking-tight", className)}>
      Fu
      <span className="bg-gradient-to-r from-primary to-primary-end bg-clip-text text-transparent">Fi</span>
    </span>
  );
}
