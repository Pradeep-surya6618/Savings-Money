"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { passwordRules } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const fieldCls = "h-11 w-full rounded-xl border border-border bg-card px-3.5 pr-10 text-sm outline-none transition focus:border-primary";

export function PasswordField({
  value,
  onChange,
  placeholder = "Enter your password",
  showRules = false,
  ariaLabel = "Password",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showRules?: boolean;
  ariaLabel?: string;
}) {
  const [show, setShow] = useState(false);
  const rules = passwordRules(value);
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={fieldCls}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showRules && (
        <ul className="space-y-1 text-xs">
          {[
            { ok: rules.length, label: "At least 8 characters" },
            { ok: rules.numberOrSymbol, label: "Include a number or special character" },
          ].map((r) => (
            <li key={r.label} className={cn("flex items-center gap-1.5", r.ok ? "text-positive" : "text-muted-foreground")}>
              <Check className="h-3.5 w-3.5" /> {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
