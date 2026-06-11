"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { useToastStore, type ToastTone } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const TONE: Record<ToastTone, { icon: LucideIcon; accent: string; ring: string }> = {
  success: { icon: CheckCircle2, accent: "text-positive", ring: "ring-positive/30" },
  error: { icon: XCircle, accent: "text-negative", ring: "ring-negative/30" },
  info: { icon: Info, accent: "text-muted-foreground", ring: "ring-border" },
};

/** Premium toaster — top-right, below the header app bar. Mounted once in the app shell. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-full max-w-sm flex-col gap-2 px-2 sm:right-6 sm:px-0">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] ring-1",
                tone.ring,
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone.accent)} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
