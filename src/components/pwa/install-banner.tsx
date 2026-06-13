"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstall } from "@/lib/pwa/use-install";
import { shouldShowInstallBanner } from "@/lib/pwa/install-utils";

const DISMISS_KEY = "pwa-install-dismissed";

export function InstallBanner() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden until localStorage is read (no flash)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!shouldShowInstallBanner({ isStandalone, isIOS, canInstall, dismissed })) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:px-0">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg shadow-black/10 backdrop-blur-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install FuFi</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground">
              Tap <Share className="inline h-3 w-3" /> Share, then &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Add FuFi to your home screen for an app-like experience.</p>
          )}
        </div>
        {!isIOS && canInstall && (
          <button
            type="button"
            onClick={promptInstall}
            className="shrink-0 cursor-pointer rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
