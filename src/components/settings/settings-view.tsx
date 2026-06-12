"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { resetAllData } from "@/lib/actions/balance";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AboutFuFi } from "@/components/settings/about-fufi";
import { useTabParam } from "@/lib/use-tab-param";
import { updatePreferences } from "@/lib/actions/settings";
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

const SECTIONS = [
  { key: "general", label: "General", icon: SlidersHorizontal },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "currency", label: "Currency", icon: IndianRupee },
  { key: "privacy", label: "Data & Privacy", icon: ShieldCheck },
  { key: "security", label: "Security", icon: Lock },
  { key: "about", label: "About FuFi", icon: Info },
] as const;
const SECTION_KEYS = SECTIONS.map((s) => s.key);

const opts = (...vals: string[]) => vals.map((v) => ({ value: v, label: v }));

export function SettingsView({ name, settings }: { name: string; settings: Prefs }) {
  // Active section lives in the URL (?section=) so it's deep-linkable and survives refresh.
  const [active, setActive] = useTabParam("section", SECTION_KEYS, "general");
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Mobile sub-nav — horizontal-scroll pills */}
      <div className="-mx-1 overflow-x-auto scrollbar-hide lg:hidden">
        <div className="flex gap-2 px-1 pb-1">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
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
              <Icon className="h-4 w-4 shrink-0" />
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
            {SECTIONS.map(({ key, label, icon: Icon }) => (
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
                <Icon className="h-4 w-4 shrink-0" />
                {label}
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
                  <p className="mt-0.5 text-xs text-muted-foreground">Light, dark, or match your system.</p>
                </div>
                <ThemeToggle />
              </div>
            </Panel>
          )}

          {active === "notifications" && (
            <Panel title="Notifications" description="Choose which nudges FuFi sends your way.">
              <ToggleRow label="Salary received reminders" description="A nudge when your salary is due to land." defaultOn />
              <ToggleRow label="Budget over-spend alerts" description="Warn me when a category goes over budget." defaultOn />
              <ToggleRow label="EMI due reminders" description="Remind me before a loan EMI is due." />
              <ToggleRow label="Savings goal milestones" description="Celebrate when a goal hits a milestone." defaultOn />
              <p className="pt-4 text-xs text-muted-foreground">Notification delivery arrives in a later update.</p>
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
  defaultOn = false,
}: {
  label: string;
  description?: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-card-elevated")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            on ? "left-[1.375rem]" : "left-0.5",
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card-elevated/50 p-3.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            danger ? "bg-negative/10 text-negative" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className={cn("text-sm font-medium", danger && "text-negative")}>{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {button}
    </div>
  );
}
