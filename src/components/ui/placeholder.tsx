import type { LucideIcon } from "lucide-react";

export function Placeholder({
  icon: Icon,
  title,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  phase: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-end text-white">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">Coming in {phase}.</p>
    </div>
  );
}
