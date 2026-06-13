"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";
import { SocialButtons } from "./social-buttons";
import { login } from "@/lib/actions/auth";
import { toast } from "@/lib/toast-store";

const inputCls = "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition focus:border-primary";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const signedOut = searchParams.get("signedout");
  // Guard so the toast fires once, not twice under React Strict Mode's dev double-invoke.
  const toasted = useRef(false);
  useEffect(() => {
    if (toasted.current) return;
    if (oauthError === "oauth_failed") toast.error("Sign-in failed. Please try again.");
    else if (oauthError === "oauth_unavailable") toast.info("That sign-in option isn't set up yet.");
    else if (signedOut) toast.success("You've been signed out.");
    else return;
    toasted.current = true;
  }, [oauthError, signedOut]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await login({ email, password });
    if (!res.ok) {
      toast.error(res.error);
      setBusy(false);
    }
    // on success the action redirects; the navigation is the success signal
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back! 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Login to continue to your FuFi account</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
      </label>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password</span>
          <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot Password?</Link>
        </div>
        <PasswordField value={password} onChange={setPassword} />
      </div>
      <Button type="submit" disabled={busy || !email.trim() || !password} className="h-11 w-full">{busy ? "Logging in…" : "Login"}</Button>
      <SocialButtons />
      <p className="text-center text-sm text-muted-foreground">
        Don&rsquo;t have an account? <Link href="/signup" className="font-semibold text-primary hover:underline">Sign up</Link>
      </p>
    </form>
  );
}
