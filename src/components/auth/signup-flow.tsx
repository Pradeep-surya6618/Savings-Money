"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";
import { OtpInput } from "./otp-input";
import { SocialButtons } from "./social-buttons";
import { sendOtp, verifyOtp, completeSignup } from "@/lib/actions/auth";
import { passwordRules } from "@/lib/auth/password";
import { AuthShell } from "./auth-shell";

const inputCls = "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition focus:border-primary";

// Left brand panel changes with the signup step.
const PANEL: Record<"email" | "otp" | "password", { title: string; slot: "wallet" | "shield" | "lock" }> = {
  email: { title: "Let's get started with your financial journey.", slot: "shield" },
  otp: { title: "Verify your email to secure your account.", slot: "shield" },
  password: { title: "Create a secure password to protect your account.", slot: "lock" },
};

export function SignupFlow() {
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await sendOtp({ name, email });
    setBusy(false);
    if (res.ok) setStep("otp");
    else setError(res.error);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await verifyOtp({ email, code });
    setBusy(false);
    if (res.ok) setStep("password");
    else setError(res.error);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setBusy(true); setError(null);
    const res = await completeSignup({ password });
    if (!res.ok) { setError(res.error); setBusy(false); } // success redirects
  }

  const rules = passwordRules(password);
  const canSubmitPassword = rules.length && rules.numberOrSymbol && password === confirm;
  const panel = PANEL[step];

  return (
    <AuthShell title={panel.title} slot={panel.slot}>
    <div className="space-y-4">
      {step === "email" && (
        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign up to start managing your finances</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Full name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={inputCls} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
          </label>
          {error && <p className="text-sm text-negative">{error}</p>}
          <Button type="submit" disabled={busy || !name.trim() || !email.trim()} className="h-11 w-full">{busy ? "Sending…" : "Send OTP"}</Button>
          <SocialButtons />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Login</Link>
          </p>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={submitOtp} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Verify OTP</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span></p>
          </div>
          <OtpInput value={code} onChange={setCode} />
          {error && <p className="text-sm text-negative">{error}</p>}
          <Button type="submit" disabled={busy || code.length !== 6} className="h-11 w-full">{busy ? "Verifying…" : "Verify & Continue"}</Button>
          <button type="button" onClick={() => setStep("email")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Change email</button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create a password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Set a password to secure your account</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">New Password</span>
            <PasswordField value={password} onChange={setPassword} placeholder="Enter new password" showRules ariaLabel="New password" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Confirm Password</span>
            <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm new password" ariaLabel="Confirm password" />
          </label>
          {error && <p className="text-sm text-negative">{error}</p>}
          <Button type="submit" disabled={busy || !canSubmitPassword} className="h-11 w-full">{busy ? "Creating…" : "Create account"}</Button>
        </form>
      )}
    </div>
    </AuthShell>
  );
}
