"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./password-field";
import { resetPassword } from "@/lib/actions/auth";
import { passwordRules } from "@/lib/auth/password";
import { toast } from "@/lib/toast-store";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const res = await resetPassword({ token, password });
    if (res.ok) {
      toast.success("Password reset. Please log in.");
      router.push("/login");
    } else {
      toast.error(res.error);
      setBusy(false);
    }
  }

  const rules = passwordRules(password);
  const canSubmit = !!token && rules.length && rules.numberOrSymbol && password === confirm;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>
      </div>
      {!token && <p className="text-sm text-negative">This reset link is invalid or has expired.</p>}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">New Password</span>
        <PasswordField value={password} onChange={setPassword} placeholder="Enter new password" showRules ariaLabel="New password" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Confirm Password</span>
        <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm new password" ariaLabel="Confirm password" />
      </label>
      <Button type="submit" disabled={busy || !canSubmit} className="h-11 w-full">{busy ? "Resetting…" : "Reset Password"}</Button>
      <p className="text-center text-sm text-muted-foreground">
        Back to <Link href="/login" className="font-semibold text-primary hover:underline">Login</Link>
      </p>
    </form>
  );
}
