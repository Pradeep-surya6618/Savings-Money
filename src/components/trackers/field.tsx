import type { ReactNode } from "react";

/** Labeled wrapper for a form input with an inline error line. */
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
    </label>
  );
}
