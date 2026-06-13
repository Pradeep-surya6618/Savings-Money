import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";
import { AuthIllustration } from "./auth-illustration";

const FEATURES = [
  "Track your salary & expenses",
  "Plan your budget wisely",
  "Save more, worry less",
  "Achieve your financial goals",
];

export function BrandPanel({ slot = "wallet" }: { slot?: "wallet" | "shield" | "lock" }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-card-elevated/40 p-8 lg:flex">
      <div className="flex items-center gap-2.5">
        <Logo className="h-10 w-10" />
        <Wordmark className="text-2xl" />
      </div>
      <div className="space-y-5">
        <h2 className="text-2xl font-bold leading-tight">Smart way to manage your salary, savings &amp; future.</h2>
        <ul className="space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <AuthIllustration slot={slot} className="h-40 w-full" />
      </div>
      <p className="text-xs text-muted-foreground">🔒 Your data is 100% safe and secure with us.</p>
    </div>
  );
}
