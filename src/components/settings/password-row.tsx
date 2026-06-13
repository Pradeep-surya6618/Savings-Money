"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { setPassword, changePassword } from "@/lib/actions/auth";
import { passwordRules } from "@/lib/auth/password";
import { toast } from "@/lib/toast-store";

const inputCls = "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary";

export function PasswordRow({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = passwordRules(password);
  const canSubmit = rules.length && rules.numberOrSymbol && password === confirm && (!hasPassword || current.length > 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setBusy(true); setError(null);
    const res = hasPassword ? await changePassword({ current, password }) : await setPassword({ password });
    setBusy(false);
    if (res.ok) {
      toast.success(hasPassword ? "Password changed" : "Password set");
      setOpen(false); setCurrent(""); setPasswordValue(""); setConfirm("");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card-elevated/50 p-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{hasPassword ? "Change password" : "Set a password"}</p>
            <p className="text-xs text-muted-foreground">
              {hasPassword ? "Update the password for email sign-in." : "Add a password so you can also sign in with email."}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>{open ? "Cancel" : hasPassword ? "Change" : "Set"}</Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-border/60 pt-4">
          {hasPassword && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Current password</span>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} autoComplete="current-password" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">New password</span>
            <PasswordField value={password} onChange={setPasswordValue} placeholder="Enter new password" showRules ariaLabel="New password" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Confirm password</span>
            <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm new password" ariaLabel="Confirm password" />
          </label>
          {error && <p className="text-sm text-negative">{error}</p>}
          <Button type="submit" disabled={busy || !canSubmit} className="w-full">
            {busy ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </Button>
        </form>
      )}
    </div>
  );
}
