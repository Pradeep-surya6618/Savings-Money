"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window));

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  }

  return { canInstall: deferred !== null, isStandalone, isIOS, promptInstall };
}
