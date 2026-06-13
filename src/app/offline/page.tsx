"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <WifiOff className="h-8 w-8" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">You&rsquo;re offline</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          FuFi needs a connection to load your latest finances. Check your network and try again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => location.reload()}
        className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
