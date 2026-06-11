"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { useToastStore, TOAST_DURATION, type ToastTone } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const TONE: Record<ToastTone, { icon: LucideIcon; chip: string; bar: string }> = {
  success: { icon: CheckCircle2, chip: "bg-positive/15 text-positive", bar: "bg-positive" },
  error: { icon: XCircle, chip: "bg-negative/15 text-negative", bar: "bg-negative" },
  info: { icon: Info, chip: "bg-card-elevated text-muted-foreground", bar: "bg-muted-foreground" },
};

/** Premium toaster — top-right, below the header app bar. Mounted once in the app shell. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-2 sm:right-6 sm:px-0">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
            >
              {/* tone accent bar */}
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
              <div className="flex items-center gap-3 py-3 pl-4 pr-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone.chip)}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="flex-1 text-sm font-medium">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* auto-dismiss progress */}
              <motion.span
                aria-hidden
                className={cn("absolute bottom-0 left-0 h-0.5", tone.bar)}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: TOAST_DURATION / 1000, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
