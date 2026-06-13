"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestReset } from "@/lib/actions/auth";

const inputCls = "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition focus:border-primary";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await requestReset({ email });
    setBusy(false);
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forgot Password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&rsquo;ll send you a link to reset your password.</p>
      </div>
      {sent ? (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm">
          If an account exists for <span className="font-medium">{email}</span>, we&rsquo;ve sent a reset link. Check your inbox.
        </p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
          </label>
          <Button type="submit" disabled={busy} className="h-11 w-full">{busy ? "Sending…" : "Send Reset Link"}</Button>
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Back to <Link href="/login" className="font-semibold text-primary hover:underline">Login</Link>
      </p>
    </form>
  );
}
