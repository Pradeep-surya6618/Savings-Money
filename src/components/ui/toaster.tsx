"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X, type LucideIcon } from "lucide-react";
import { useToastStore, type ToastTone } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const TONE: Record<ToastTone, { icon: LucideIcon; badge: string }> = {
  success: { icon: Check, badge: "bg-positive" },
  error: { icon: X, badge: "bg-negative" },
  info: { icon: Info, badge: "bg-muted-foreground" },
};

/** Premium toaster — sleek contrast pill, top-right, below the header app bar. */
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
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-foreground py-2 pl-2 pr-4 text-background shadow-2xl shadow-black/20"
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white", tone.badge)}>
                <Icon className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 text-background/50 transition hover:text-background"
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
