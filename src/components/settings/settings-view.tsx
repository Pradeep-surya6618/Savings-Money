"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { resetAllData } from "@/lib/actions/balance";
import { logout } from "@/lib/actions/auth";
import {
  SlidersHorizontal,
  Palette,
  Bell,
  IndianRupee,
  ShieldCheck,
  Lock,
  Info,
  Download,
  Upload,
  Trash2,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AboutFuFi } from "@/components/settings/about-fufi";
import { PasswordRow } from "@/components/settings/password-row";
import { useTabParam } from "@/lib/use-tab-param";
import { updatePreferences } from "@/lib/actions/settings";
import { updateNotifyPrefs } from "@/lib/actions/notifications";
import type { NotifyPrefs } from "@/validations/settings";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

type Prefs = {
  language: string;
  dateFormat: string;
  firstDayOfWeek: string;
  defaultView: string;
  currency: string;
  locale: string;
};

// Distinct palette — intentionally none of the dashboard nav colors
// (green/blue/orange/violet/teal/pink/amber/slate).
const SECTIONS = [
  { key: "general", label: "General", icon: SlidersHorizontal, color: "#6366f1" }, // indigo
  { key: "appearance", label: "Appearance", icon: Palette, color: "#d946ef" }, // fuchsia
  { key: "notifications", label: "Notifications", icon: Bell, color: "#f43f5e" }, // rose
  { key: "currency", label: "Currency", icon: IndianRupee, color: "#84cc16" }, // lime
  { key: "privacy", label: "Data & Privacy", icon: ShieldCheck, color: "#0ea5e9" }, // sky
  { key: "security", label: "Security", icon: Lock, color: "#ef4444" }, // red
  { key: "about", label: "About FuFi", icon: Info, color: "#06b6d4" }, // cyan
] as const;
const SECTION_KEYS = SECTIONS.map((s) => s.key);

const opts = (...vals: string[]) => vals.map((v) => ({ value: v, label: v }));

export function SettingsView({
  name,
  hasPassword,
  settings,
  notifyPrefs,
}: {
  name: string;
  hasPassword: boolean;
  settings: Prefs;
  notifyPrefs: NotifyPrefs;
}) {
  // Active section lives in the URL (?section=) so it's deep-linkable and survives refresh.
  const [active, setActive] = useTabParam("section", SECTION_KEYS, "general");
  const [notify, setNotify] = useState<NotifyPrefs>(notifyPrefs);
  const [prefs, setPrefs] = useState<Prefs>(settings);
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  async function doReset() {
    setResetting(true);
    const res = await resetAllData();
    if (res.ok) {
      toast.success("All data reset");
      setResetOpen(false);
      setConfirmText("");
      router.push("/");
    } else {
      toast.error(res.error);
      setResetting(false);
    }
  }

  async function save(next: Prefs) {
    setPrefs(next);
    const res = await updatePreferences(next);
    if (res.ok) toast.success("Preferences saved");
    else toast.error(res.error);
  }
  const set = (patch: Partial<Prefs>) => save({ ...prefs, ...patch });

  async function saveNotify(patch: Partial<NotifyPrefs>) {
    const next = { ...notify, ...patch };
    setNotify(next);
    const res = await updateNotifyPrefs(next);
    if (res.ok) toast.success("Notification preferences saved");
    else {
      setNotify(notify);
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Mobile sub-nav — horizontal-scroll pills */}
      <div className="-mx-1 overflow-x-auto scrollbar-hide lg:hidden">
        <div className="flex gap-2 px-1 pb-1">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition",
                active === key
                  ? "border-transparent bg-brand text-white shadow-sm shadow-primary/25"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" style={active === key ? undefined : { color }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* Desktop sub-nav — sticky; right panel scrolls with the page */}
        <Card className="hidden h-max p-2 lg:sticky lg:top-24 lg:block">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Preferences</p>
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  active === key
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-card-elevated hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                {label}
                {active === key && (
                  <motion.span
                    layoutId="settings-active-dot"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="relative ml-auto flex h-2 w-2 shrink-0"
                    aria-hidden
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </motion.span>
                )}
              </button>
            ))}
          </nav>
        </Card>

        {/* Panel */}
        <Card className="space-y-6">
          {active === "general" && (
            <Panel title="General Settings" description="Language, formatting, and what you see first.">
              <Field label="Language" description="The language used across the app.">
                <Select value={prefs.language} onValueChange={(v) => set({ language: v })} options={opts("English", "Hindi")} />
              </Field>
              <Field label="Date Format" description="How dates appear throughout FuFi.">
                <Select
                  value={prefs.dateFormat}
                  onValueChange={(v) => set({ dateFormat: v })}
                  options={opts("DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD")}
                />
              </Field>
              <Field label="First Day of Week" description="Used by calendars and weekly views.">
                <Select
                  value={prefs.firstDayOfWeek}
                  onValueChange={(v) => set({ firstDayOfWeek: v })}
                  options={opts("Monday", "Sunday")}
                />
              </Field>
              <Field label="Default View" description="The page shown when you open FuFi.">
                <Select
                  value={prefs.defaultView}
                  onValueChange={(v) => set({ defaultView: v })}
                  options={opts("Home", "Transactions", "Budget", "Analytics")}
                />
              </Field>
            </Panel>
          )}

          {active === "appearance" && (
            <Panel title="Appearance" description="Make FuFi feel like yours.">
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Switch between light and dark.</p>
                </div>
                <ThemeToggle />
              </div>
            </Panel>
          )}

          {active === "notifications" && (
            <Panel title="Notifications" description="Choose which nudges FuFi sends your way.">
              <ToggleRow
                label="Salary reminders"
                description="Nudge when this month's salary isn't logged yet."
                checked={notify.salary}
                onChange={(v) => saveNotify({ salary: v })}
              />
              <ToggleRow
                label="Budget over-spend alerts"
                description="Warn when a category goes over its allocation."
                checked={notify.budget}
                onChange={(v) => saveNotify({ budget: v })}
              />
              <ToggleRow
                label="Savings goal milestones"
                description="Celebrate when a goal crosses 25 / 50 / 75 / 100%."
                checked={notify.savings}
                onChange={(v) => saveNotify({ savings: v })}
              />
            </Panel>
          )}

          {active === "currency" && (
            <Panel title="Currency & Format" description="How amounts are shown across FuFi.">
              <Field label="Currency" description="The symbol used for all amounts.">
                <Select value={prefs.currency} onValueChange={(v) => set({ currency: v })} options={opts("INR", "USD", "EUR", "GBP")} />
              </Field>
              <Field label="Number Locale" description="Controls grouping and decimal style.">
                <Select value={prefs.locale} onValueChange={(v) => set({ locale: v })} options={opts("en-IN", "en-US", "en-GB")} />
              </Field>
            </Panel>
          )}

          {active === "privacy" && (
            <Panel title="Data Management" description="Take your data with you, or bring it in.">
              <div className="space-y-3 pt-4">
                <ActionRow
                  title="Export Data"
                  desc="Download all your data as a file."
                  icon={Download}
                  button={<Button variant="outline" onClick={() => toast.info("Export arrives in a later update")}>Export</Button>}
                />
                <ActionRow
                  title="Import Data"
                  desc="Import transactions from a CSV."
                  icon={Upload}
                  button={<Button variant="outline" onClick={() => toast.info("Import arrives in a later update")}>Import</Button>}
                />
              </div>
            </Panel>
          )}

          {active === "security" && (
            <Panel title="Security" description="Manage access and the data stored on your account.">
              <div className="space-y-3 pt-4">
                <PasswordRow hasPassword={hasPassword} />
                <ActionRow
                  title="Log out"
                  desc="Sign out of your FuFi account on this device."
                  icon={LogOut}
                  button={
                    <Button variant="outline" onClick={() => logout()}>
                      Log out
                    </Button>
                  }
                />
                <ActionRow
                  title="Reset all data"
                  desc="Permanently delete all your salary, transactions, savings & loan data."
                  icon={Trash2}
                  danger
                  button={
                    <Button onClick={() => setResetOpen(true)} className="from-negative to-negative">
                      Reset
                    </Button>
                  }
                />
              </div>
            </Panel>
          )}

          {active === "about" && (
            <Panel title="About FuFi" description="The story behind the app.">
              <div className="pt-4">
                <AboutFuFi name={name} />
              </div>
            </Panel>
          )}
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={(o) => { if (!o && !resetting) { setResetOpen(false); setConfirmText(""); } }}>
        <DialogContent title="Reset all data">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This permanently deletes your salary, transactions, savings and loan data and resets your opening
              balance. Your login and preferences stay. This can&rsquo;t be undone.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type reset to confirm"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setResetOpen(false); setConfirmText(""); }} disabled={resetting}>
                Cancel
              </Button>
              <Button
                onClick={doReset}
                disabled={resetting || confirmText !== "reset"}
                className="from-negative to-negative"
              >
                {resetting ? "Resetting…" : "Reset everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="w-44 shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-card-elevated")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

function ActionRow({
  title,
  desc,
  icon: Icon,
  button,
  danger = false,
}: {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  button: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-elevated/50 p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Row 1 (mobile) / left (desktop): icon + title — plus description on desktop */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              danger ? "bg-negative/10 text-negative" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", danger && "text-negative")}>{title}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{desc}</p>
          </div>
        </div>
        {/* Row 2 (mobile): description + button. Desktop: button only. */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:hidden">{desc}</p>
          <div className="shrink-0">{button}</div>
        </div>
      </div>
    </div>
  );
}
