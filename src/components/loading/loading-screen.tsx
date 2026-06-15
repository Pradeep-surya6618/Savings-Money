"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/** Branded full-screen loading splash: a floating logo, a pulsing glow and an
 *  indeterminate progress bar that sweeps continuously. Used as the app's
 *  loading fallback (unknown duration → indeterminate bar, never freezes). */
export function LoadingScreen() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Logo: pulsing glow behind + gentle float */}
      <div className="relative flex items-center justify-center">
        <motion.div
          aria-hidden
          className="absolute -z-10 h-56 w-56 rounded-full bg-primary/15 blur-3xl sm:h-72 sm:w-72"
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.9, 1.06, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
          <Image
            src="/error/FuFi-Loading.png"
            alt="FuFi — loading"
            width={671}
            height={598}
            priority
            className="h-auto w-60 object-contain sm:w-72 lg:w-80"
          />
        </motion.div>
      </div>

      {/* Copy + indeterminate progress bar */}
      <div className="mt-6 w-full max-w-sm">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Loading your future…</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Please wait while we get things ready</p>

        <div className="relative mt-5 h-2 w-full overflow-hidden rounded-full bg-card-elevated">
          <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-primary to-primary-end animate-[loading-sweep_1.3s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Bottom green glow (the "wave" ambience) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(34,197,94,0.18),transparent)]"
      />
    </div>
  );
}
