export type InstallState = {
  isStandalone: boolean;
  isIOS: boolean;
  canInstall: boolean;
  dismissed: boolean;
};

/** Whether to show the install banner. Hidden if installed or dismissed; otherwise
 *  shown when the browser can prompt (Android/Chrome) or on iOS (manual hint). */
export function shouldShowInstallBanner(s: InstallState): boolean {
  if (s.isStandalone || s.dismissed) return false;
  return s.isIOS || s.canInstall;
}
