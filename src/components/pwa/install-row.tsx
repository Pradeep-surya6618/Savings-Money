"use client";

import { Check, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstall } from "@/lib/pwa/use-install";

export function InstallRow() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstall();

  const desc = isStandalone
    ? "FuFi is installed on this device."
    : isIOS
      ? "Tap Share, then “Add to Home Screen”."
      : "Add FuFi to your home screen for an app-like experience.";

  const action = isStandalone ? (
    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-positive">
      <Check className="h-4 w-4" /> Installed
    </span>
  ) : !isIOS && canInstall ? (
    <Button variant="outline" onClick={promptInstall} className="shrink-0">
      Install
    </Button>
  ) : isIOS ? (
    <Share className="h-5 w-5 shrink-0 text-muted-foreground" />
  ) : null;

  return (
    <div className="rounded-xl border border-border bg-card-elevated/50 p-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Row 1 (mobile) / left (desktop): icon + title (+ description on desktop) */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Download className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Install FuFi</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{desc}</p>
          </div>
        </div>
        {/* Row 2 (mobile): description left + action right · desktop: action only */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-muted-foreground sm:hidden">{desc}</p>
          {action}
        </div>
      </div>
    </div>
  );
}
