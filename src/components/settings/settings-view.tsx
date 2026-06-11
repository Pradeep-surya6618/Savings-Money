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
type SectionKey = (typeof SECTIONS)[number]["key"];

const opts = (...vals: string[]) => vals.map((v) => ({ value: v, label: v }));

export function SettingsView({ name, settings }: { name: string; settings: Prefs }) {
  const [active, setActive] = useState<SectionKey>("general");
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
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* Sub-nav */}
        <Card className="h-max p-2">
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
            <Panel title="General Settings">
              <Field label="Language">
                <Select value={prefs.language} onValueChange={(v) => set({ language: v })} options={opts("English", "Hindi")} />
              </Field>
              <Field label="Date Format">
                <Select
                  value={prefs.dateFormat}
                  onValueChange={(v) => set({ dateFormat: v })}
                  options={opts("DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD")}
                />
              </Field>
              <Field label="First Day of Week">
                <Select
                  value={prefs.firstDayOfWeek}
                  onValueChange={(v) => set({ firstDayOfWeek: v })}
                  options={opts("Monday", "Sunday")}
                />
              </Field>
              <Field label="Default View">
                <Select
                  value={prefs.defaultView}
                  onValueChange={(v) => set({ defaultView: v })}
                  options={opts("Home", "Transactions", "Budget", "Analytics")}
                />
              </Field>
            </Panel>
          )}

          {active === "appearance" && (
            <Panel title="Appearance">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Light, dark, or match your system.</p>
                </div>
                <ThemeToggle />
              </div>
            </Panel>
          )}

          {active === "notifications" && (
            <Panel title="Notifications">
              <ToggleRow label="Salary received reminders" defaultOn />
              <ToggleRow label="Budget over-spend alerts" defaultOn />
              <ToggleRow label="EMI due reminders" />
              <ToggleRow label="Savings goal milestones" defaultOn />
              <p className="pt-1 text-xs text-muted-foreground">Notification delivery arrives in a later update.</p>
            </Panel>
          )}

          {active === "currency" && (
            <Panel title="Currency & Format">
              <Field label="Currency">
                <Select value={prefs.currency} onValueChange={(v) => set({ currency: v })} options={opts("INR", "USD", "EUR", "GBP")} />
              </Field>
              <Field label="Number Locale">
                <Select value={prefs.locale} onValueChange={(v) => set({ locale: v })} options={opts("en-IN", "en-US", "en-GB")} />
              </Field>
            </Panel>
          )}

          {active === "privacy" && (
            <Panel title="Data Management">
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
            </Panel>
          )}

          {active === "security" && (
            <Panel title="Security">
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
            </Panel>
          )}

          {active === "about" && (
            <Panel title="About FuFi">
              <p className="text-sm">
                <span className="font-semibold">FuFi</span> — Fund Your Future.
              </p>
              <p className="text-sm text-muted-foreground">A premium personal finance manager for {name}.</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <span className="w-48">{children}</span>
    </label>
  );
}

function ToggleRow({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn("relative h-6 w-11 rounded-full transition", on ? "bg-primary" : "bg-card-elevated")}
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
