import { describe, it, expect } from "vitest";
import { shouldShowInstallBanner } from "@/lib/pwa/install-utils";

const base = { isStandalone: false, isIOS: false, canInstall: false, dismissed: false };

describe("shouldShowInstallBanner", () => {
  it("hidden when already installed (standalone)", () => {
    expect(shouldShowInstallBanner({ ...base, isStandalone: true, canInstall: true })).toBe(false);
  });
  it("hidden when dismissed", () => {
    expect(shouldShowInstallBanner({ ...base, dismissed: true, canInstall: true })).toBe(false);
  });
  it("shown on a browser that can prompt (non-iOS)", () => {
    expect(shouldShowInstallBanner({ ...base, canInstall: true })).toBe(true);
  });
  it("shown on iOS even without a prompt event", () => {
    expect(shouldShowInstallBanner({ ...base, isIOS: true })).toBe(true);
  });
  it("hidden on a non-iOS browser that cannot prompt", () => {
    expect(shouldShowInstallBanner({ ...base })).toBe(false);
  });
});
