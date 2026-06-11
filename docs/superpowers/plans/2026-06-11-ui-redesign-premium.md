# Premium UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, batch-with-checkpoints) — the approved approach is "foundation first, then pages, polish live." Steps use checkbox (`- [ ]`) syntax. Page visual fidelity (exact spacing/classes) is iterated **live against the running app**; this plan pins component APIs, data wiring, and the non-obvious implementation code so the structure is correct the first time.

**Goal:** Restyle the entire app (7 pages, both themes) to match `public/UI/FuFi-UI.png` / `FuFi-Dark-UI.png` via a shared premium design system, premium form controls, and a few new real-data visuals.

**Architecture:** Build reusable UI primitives first (`Select`, `DatePicker`, `MonthPicker`, `SearchInput`, `SectionCard`, `StatCard`, `MiniSparkline`, `RingStat`, `GaugeChart`, `DataTable`, `Timeline`), tune theme tokens, then restyle each page to compose them. Server components read existing services; charts/pickers/forms are client components. One new TDD'd pure module (`health-score`) and small Settings persistence.

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, framer-motion, `@radix-ui/react-select` + `@radix-ui/react-popover` (NEW), Vitest.

**Verification:** Always use `npx` forms (`npm run` is unreliable in this Windows harness): `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`. Commit after each task.

---

## File Structure
(Per the spec §5.) New primitives in `src/components/ui/`; `lib/health-score.ts` (+test); `services/health.ts`; `lib/actions/settings.ts`; `models/Settings.ts` extended; `components/settings/*`; per-page components restyled. `MonthPicker` replaces `dashboard/month-switcher.tsx` and `ui/month-nav.tsx`.

---

# BATCH 0 — Foundation

## Task 0.1: Install deps + theme/surface tokens

**Files:** `package.json` (deps), `src/app/globals.css`

- [ ] **Step 1: Install the two Radix packages**

Run: `npm install @radix-ui/react-select @radix-ui/react-popover`
Expected: both added to `dependencies`.

- [ ] **Step 2: Add card-shadow + tune dark tokens in `globals.css`**

In `:root` add `--shadow-card: 0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06);`. In `.dark` add `--shadow-card: 0 1px 2px rgba(0,0,0,.30), 0 6px 20px rgba(0,0,0,.35);` and tune for the dark mockup: `--card-elevated: #1a221d;` (slightly lighter than `--card`), keep `--background: #0a0f0d`. Map nothing new in `@theme inline` (shadow is used via `var()`).

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` (clean — CSS change is no-op for TS), then commit:
```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "chore: add radix select+popover; card-shadow + dark token tuning"
```

---

## Task 0.2: `Select` (premium dropdown)

**Files:** Create `src/components/ui/select.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <RS.Root value={value} onValueChange={onValueChange}>
      <RS.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary data-[placeholder]:text-muted-foreground",
          className,
        )}
      >
        <RS.Value placeholder={placeholder} />
        <RS.Icon>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <RS.Viewport className="p-1">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-card-elevated data-[state=checked]:font-medium"
              >
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator>
                  <Check className="h-4 w-4 text-primary" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint .`. Commit:
```bash
git add src/components/ui/select.tsx
git commit -m "feat: premium Select control (radix)"
```

---

## Task 0.3: Calendar core + `DatePicker`

**Files:** Create `src/lib/calendar.ts` (+`src/lib/calendar.test.ts`), `src/components/ui/date-picker.tsx`

- [ ] **Step 1: Write failing test `src/lib/calendar.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { monthGrid } from "./calendar";

describe("monthGrid", () => {
  it("returns 42 cells, Monday-first, with the 1st in the right slot", () => {
    const cells = monthGrid(2026, 6); // June 2026; 1 Jun 2026 is a Monday
    expect(cells).toHaveLength(42);
    // first cell is Mon 1 Jun (June 1 2026 is Monday)
    expect(cells[0]).toEqual({ date: "2026-06-01", inMonth: true });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(30);
  });
  it("pads leading days from the previous month", () => {
    const cells = monthGrid(2026, 7); // July 2026; 1 Jul 2026 is a Wednesday
    expect(cells[0].inMonth).toBe(false); // Monday 29 Jun
    expect(cells.find((c) => c.date === "2026-07-01")?.inMonth).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/lib/calendar.test.ts`)

- [ ] **Step 3: Implement `src/lib/calendar.ts`**

```ts
export type DayCell = { date: string; inMonth: boolean }; // date = YYYY-MM-DD

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A 6×7 Monday-first grid for the given year/month (month is 1–12). */
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Monday-first offset: getUTCDay() is 0(Sun)..6(Sat) → Mon=0..Sun=6
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return {
      date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      inMonth: d.getUTCMonth() === month - 1,
    };
  });
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Implement `src/components/ui/date-picker.tsx`**

```tsx
"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const WD = ["M", "T", "W", "T", "F", "S", "S"];

function fmt(iso: string): string {
  if (!iso) return "Pick a date";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** value/onChange use "YYYY-MM-DD" strings (matches form value shapes). */
export function DatePicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const today = value || "";
  const [y, m] = (value || "2026-01-01").split("-").map(Number);
  const [view, setView] = useState({ year: y, month: m }); // month 1–12
  const cells = monthGrid(view.year, view.month);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(view.year, view.month - 1 + n, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary",
          className,
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={value ? "" : "text-muted-foreground"}>{fmt(value)}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded-lg p-1 hover:bg-card-elevated">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {new Date(Date.UTC(view.year, view.month - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}
            </span>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded-lg p-1 hover:bg-card-elevated">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            {WD.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {cells.map((c) => (
              <Popover.Close key={c.date} asChild>
                <button
                  type="button"
                  onClick={() => onChange(c.date)}
                  className={cn(
                    "h-8 rounded-lg text-sm tabular-nums transition",
                    c.inMonth ? "hover:bg-card-elevated" : "text-muted-foreground/40",
                    c.date === today && "bg-primary text-white hover:bg-primary",
                  )}
                >
                  {Number(c.date.slice(8))}
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 6: Verify + commit**

Run: `npx vitest run src/lib/calendar.test.ts`, `npx tsc --noEmit`, `npx eslint .`. Commit:
```bash
git add src/lib/calendar.ts src/lib/calendar.test.ts src/components/ui/date-picker.tsx
git commit -m "feat: calendar grid (TDD) + premium DatePicker"
```

---

## Task 0.4: `MonthPicker` (replaces MonthSwitcher + MonthNav)

**Files:** Create `src/components/ui/month-picker.tsx`; later tasks delete `src/components/dashboard/month-switcher.tsx` and `src/components/ui/month-nav.tsx` once call-sites move.

- [ ] **Step 1: Implement** — a popover with prev/next, a 12-month grid, year stepper; navigates `?month=` via `next/navigation` `useRouter`. Future months disabled.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  const router = useRouter();
  const [yr, setYr] = useState(Number(month.slice(0, 4)));
  const cur = currentMonth();
  const go = (m: string) => {
    if (m > cur) return;
    router.push(`${basePath}?month=${m}`);
  };
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium outline-none transition hover:bg-card-elevated">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {monthLabel(month)}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="end" className="z-50 w-64 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYr((y) => y - 1)} aria-label="Previous year" className="rounded-lg p-1 hover:bg-card-elevated"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold tabular-nums">{yr}</span>
            <button type="button" onClick={() => setYr((y) => Math.min(y + 1, Number(cur.slice(0, 4))))} aria-label="Next year" className="rounded-lg p-1 hover:bg-card-elevated"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((label, i) => {
              const m = `${yr}-${String(i + 1).padStart(2, "0")}`;
              const disabled = m > cur;
              const active = m === month;
              return (
                <Popover.Close key={m} asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => go(m)}
                    className={cn(
                      "rounded-lg py-2 text-sm transition disabled:opacity-30",
                      active ? "bg-primary text-white" : "hover:bg-card-elevated",
                    )}
                  >
                    {label}
                  </button>
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit`, `npx eslint .`. Commit:
```bash
git add src/components/ui/month-picker.tsx
git commit -m "feat: premium MonthPicker (?month= popover)"
```
*(`addMonths` import is used by a later "Today/Prev" affordance if added; if eslint flags it as unused, remove the import.)*

---

## Task 0.5: Display primitives — `SectionCard`, `StatCard`, `MiniSparkline`, `RingStat`, `GaugeChart`, `DataTable`, `Timeline`, `SearchInput`

**Files:** create each under `src/components/ui/`.

- [ ] **Step 1: `section-card.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title, action, children, className,
}: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: `mini-sparkline.tsx`** (slim area line for stat cards)

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

export function MiniSparkline({ points, color = "currentColor", width = 72, height = 28 }: { points: number[]; color?: string; width?: number; height?: number }) {
  const reduce = useReducedMotion();
  if (points.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
    </svg>
  );
}
```

- [ ] **Step 3: `stat-card.tsx`** (REWORK — replaces current StatCard)

```tsx
import type { ComponentType, ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

export function StatCard({
  label, value, pct, icon: Icon, accentColor, chart,
}: {
  label: string;
  value: number;
  pct?: number;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
  chart?: ReactNode; // a <MiniSparkline /> or similar
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(value)}</p>
          {pct != null && <p className="text-xs text-muted-foreground tabular-nums">{pct}%</p>}
        </div>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: accentColor ? `${accentColor}1f` : "var(--card-elevated)", color: accentColor ?? "var(--muted-foreground)" }}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {chart && <div className="mt-2" style={{ color: accentColor }}>{chart}</div>}
    </div>
  );
}
```

- [ ] **Step 4: `ring-stat.tsx`** (card wrapping ProgressRing)

```tsx
import type { ReactNode } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

export function RingStat({
  pct, color, caption, sub, size = 200, className,
}: { pct: number; color?: string; caption: string; sub?: ReactNode; size?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing value={pct} color={color} size={size} strokeWidth={14}>
        <span className="text-4xl font-bold tabular-nums">{Math.round(pct)}%</span>
        <span className="mt-1 max-w-[10rem] text-center text-xs text-muted-foreground">{caption}</span>
      </ProgressRing>
      {sub && <div className="text-sm tabular-nums text-muted-foreground">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 5: `gauge-chart.tsx`** (semicircular gauge)

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

const BANDS = [
  { min: 85, label: "Excellent", color: "#16a34a" },
  { min: 70, label: "Good", color: "#22c55e" },
  { min: 50, label: "Fair", color: "#f59e0b" },
  { min: 0, label: "Needs work", color: "#e11d48" },
];

export function GaugeChart({ score, size = 220 }: { score: number; size?: number }) {
  const reduce = useReducedMotion();
  const s = Math.min(100, Math.max(0, score));
  const band = BANDS.find((b) => s >= b.min)!;
  const r = (size - 24) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = Math.PI * r; // half circle
  const offset = circ * (1 - s / 100);
  // semicircle path from left to right (180°)
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
        <motion.path d={d} fill="none" stroke={band.color} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }} />
      </svg>
      <div className="-mt-10 text-center">
        <p className="text-4xl font-bold tabular-nums">{Math.round(s)}</p>
        <p className="text-sm font-medium" style={{ color: band.color }}>{band.label}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `data-table.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = { key: string; header: string; align?: "left" | "right"; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, rows, rowKey, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-3 font-medium", c.align === "right" ? "text-right" : "text-left")}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">{empty ?? "Nothing here yet."}</td></tr>
          ) : rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border/60 transition last:border-0 hover:bg-card-elevated/50">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3", c.align === "right" ? "text-right tabular-nums" : "text-left")}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: `timeline.tsx`** (savings milestones)

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineStep = { label: string; caption: string; state: "done" | "next" | "todo" };

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((s, i) => (
        <div key={i} className="relative flex flex-1 flex-col items-center">
          {i < steps.length - 1 && (
            <span className={cn("absolute left-1/2 top-3 h-0.5 w-full", s.state === "done" ? "bg-primary" : "bg-border")} />
          )}
          <span className={cn(
            "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2",
            s.state === "done" ? "border-primary bg-primary text-white"
              : s.state === "next" ? "border-primary bg-card text-primary"
              : "border-border bg-card text-muted-foreground",
          )}>
            {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className="mt-2 text-xs font-medium tabular-nums">{s.label}</span>
          <span className="text-[10px] text-muted-foreground">{s.caption}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: `search-input.tsx`**

```tsx
"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary"
      />
    </div>
  );
}
```

- [ ] **Step 9: Verify + commit**

Run: `npx tsc --noEmit`, `npx eslint .`. Commit:
```bash
git add src/components/ui/{section-card,mini-sparkline,stat-card,ring-stat,gauge-chart,data-table,timeline,search-input}.tsx
git commit -m "feat: premium display primitives (section/stat/ring/gauge/table/timeline/search)"
```

---

## Task 0.6: Financial Health Score (TDD)

**Files:** `src/lib/health-score.ts` (+`.test.ts`)

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { financialHealthScore } from "./health-score";

describe("financialHealthScore", () => {
  it("weights savings (40%), budget adherence (35%), loan progress (25%)", () => {
    const r = financialHealthScore({ savingsRate: 30, budgetAdherence: 100, loanProgress: 80, hasLoan: true });
    expect(r.score).toBe(95); // 0.4*100 + 0.35*100 + 0.25*80
    expect(r.band).toBe("Excellent");
  });
  it("caps the savings component at a 30% rate and floors negatives", () => {
    expect(financialHealthScore({ savingsRate: 50, budgetAdherence: 0, loanProgress: 0, hasLoan: true }).score).toBe(40);
    expect(financialHealthScore({ savingsRate: -10, budgetAdherence: 0, loanProgress: 0, hasLoan: true }).score).toBe(0);
  });
  it("treats no-loan as full loan-progress credit", () => {
    expect(financialHealthScore({ savingsRate: 0, budgetAdherence: 0, loanProgress: 0, hasLoan: false }).score).toBe(25);
  });
  it("bands: >=85 Excellent, >=70 Good, >=50 Fair, else Needs work", () => {
    expect(financialHealthScore({ savingsRate: 24, budgetAdherence: 90, loanProgress: 42, hasLoan: true }).band).toBe("Good");
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/lib/health-score.test.ts`)

- [ ] **Step 3: Implement**

```ts
export type HealthBand = "Excellent" | "Good" | "Fair" | "Needs work";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 0–100 score from savings rate (%), budget adherence (%), loan progress (%). */
export function financialHealthScore(input: {
  savingsRate: number;      // net/income %
  budgetAdherence: number;  // % of budget within plan, 0–100
  loanProgress: number;     // % repaid, 0–100
  hasLoan: boolean;
}): { score: number; band: HealthBand } {
  const savings = clamp((input.savingsRate / 30) * 100, 0, 100); // 30%+ rate = full marks
  const budget = clamp(input.budgetAdherence, 0, 100);
  const loan = input.hasLoan ? clamp(input.loanProgress, 0, 100) : 100;
  const score = Math.round(0.4 * savings + 0.35 * budget + 0.25 * loan);
  const band: HealthBand = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs work";
  return { score, band };
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add src/lib/health-score.ts src/lib/health-score.test.ts
git commit -m "feat: financial health score (TDD)"
```

*(The `getAnalytics` service / a small `services/health.ts` will compute the three inputs from real data: `savingsRate` = latest month's rate; `budgetAdherence` = share of current-month budget rows not "over"; `loanProgress` = `loanStats.pct`. Wired in Batch B Analytics.)*

---

## Task 0.7: Shell polish — Sidebar, TopBar greeting, MobileHeader

**Files:** `src/components/navigation/{sidebar,top-bar,mobile-header}.tsx`, `src/app/(app)/layout.tsx` (pass user name)

- [ ] **Step 1:** In `src/app/(app)/layout.tsx`, fetch the user name and pass `name` alongside `greeting`:
```tsx
import { getCurrentUser } from "@/lib/user";
// inside AppLayout (make it async):
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await getCurrentUser();
  return <AppShell greeting={greetingFor(new Date())} name={user.name}>{children}</AppShell>;
}
```
Thread `name` through `AppShell` → `TopBar` + `MobileHeader`.

- [ ] **Step 2:** `top-bar.tsx` — left: `"{greeting}, {name} 👋"` (bold) + `"Here's your financial overview"` (muted subtitle). Right: keep Bell + ThemeToggle (+ the system/display toggle already in ThemeToggle). Match mockup spacing.

- [ ] **Step 3:** `sidebar.tsx` — align active item to soft-green pill + green text, tune spacing/typography and the user footer (`name` + "Premium Plan") to the mockup. Keep collapse + per-item colors.

- [ ] **Step 4:** Verify + commit:
```bash
git add "src/app/(app)/layout.tsx" src/components/navigation/app-shell.tsx src/components/navigation/top-bar.tsx src/components/navigation/mobile-header.tsx src/components/navigation/sidebar.tsx
git commit -m "feat: shell polish — greeting top bar, sidebar, mobile header"
```

- [ ] **Step 5: Live checkpoint** — run `npm run dev`; confirm shell + a primitive (e.g. open a `Select`/`MonthPicker`) render correctly in light & dark before starting pages.

---

# BATCH A — Dashboard + Transactions

## Task A.1: Dashboard restyle

**Files:** `src/app/(app)/page.tsx`, `src/components/dashboard/{quick-stats→stat-row,salary-distribution,smart-insights,hero-card}.tsx`; remove dashboard `SavingsCard`/`LoanCard` usage.

- [ ] **Step 1:** Replace `QuickStats` with a `DashboardStats` row of four `StatCard`s: **Total Expenses** (`stats.expenses`, % of salary, red `MiniSparkline` of recent expense trend), **Savings** (`stats.savings`, green sparkline), **Loan Paid** (`stats.loan`, icon), **Remaining** (`stats.remaining`, icon). Page fetches `getMonthSummary(month)` + `getAnalytics(month)` (for sparkline series: expense trend = `monthly.map(m=>m.expense)`; savings trend derived from monthly net or savings series).
- [ ] **Step 2:** Restyle `SalaryDistribution` into a `SectionCard title="Budget Allocation"` (keep the list; add an Amount / % column header row to match mockup). Restyle `SmartInsights` into a `SectionCard title="Smart Insights"` with the existing insight rows + a "View all insights" footer button.
- [ ] **Step 3:** Update `page.tsx` layout: hero (full width) → 4 stat cards (`grid-cols-2 lg:grid-cols-4`) → `lg:grid-cols-2` row with Budget Allocation + Smart Insights. Replace `MonthSwitcher` in hero with `MonthPicker` (page header) — or keep month control in hero per live polish. Remove the `SavingsCard`/`LoanCard` import + row.
- [ ] **Step 4:** Verify (`npx tsc --noEmit`, `npx eslint .`, `npx next build`) + commit `feat: redesign dashboard (stat cards, allocation, insights)`.
- [ ] **Step 5: Live checkpoint** — review dashboard light/dark; polish spacing/sparkline data.

## Task A.2: Transactions restyle

**Files:** `src/components/transactions/{transactions-view,transaction-toolbar,transaction-row,transaction-form,summary-strip}.tsx`

- [ ] **Step 1:** Desktop: render a `DataTable` (columns Date · Title · Category chip · Type pill · Amount signed/colored · Notes) for `lg+`; keep the `transaction-row` card list for mobile (`lg:hidden`). Toolbar uses `SearchInput` + the type segmented control + `Select` for category/month/sort (replace native `<select>`), + green **Add Transaction** `Button`.
- [ ] **Step 2:** `transaction-form.tsx` — swap the native category `<select>` → `Select`, the `<input type="date">` → `DatePicker`. Keep RHF wiring (`setValue`/`watch` for the controlled `Select`/`DatePicker`).
- [ ] **Step 3:** `summary-strip` restyle to the footer summary (Total income / Total expenses / Net savings) per mockup.
- [ ] **Step 4:** Verify + commit `feat: redesign transactions (desktop table, premium filters/form)`.
- [ ] **Step 5: Live checkpoint.**

---

# BATCH B — Budget + Analytics

## Task B.1: Budget restyle
**Files:** `src/components/budget/{budget-view,budget-row}.tsx`
- [ ] **Step 1:** Top row: `RingStat` (Budget Overview — `pct = totals.actual/salaryAmount*100`, caption "of budget used", sub "₹actual of ₹salary") beside a **Category Budget** `DataTable` (Category · Budget · Spent · % Used with a thin per-row bar).
- [ ] **Step 2:** Add three `StatCard`s: **Over Budget** (count + total over, from `rows.filter(status==="over")`), **Under Budget**, **On Track** (`near`). Derive counts/amounts in `budget-view`.
- [ ] **Step 3:** Keep grouping/unbudgeted as a secondary section. Use `MonthPicker`. Verify + commit `feat: redesign budget (overview ring, category table, status cards)`.
- [ ] **Step 4: Live checkpoint.**

## Task B.2: Analytics restyle + Financial Health Score
**Files:** `src/components/analytics/{analytics-view,...}.tsx`, `src/services/analytics.ts` (add health inputs) or new `src/services/health.ts`
- [ ] **Step 1:** Add a tab bar (Overview · Spending · Savings · Loan) — local `useState` tab in `analytics-view` (client). Overview = Monthly Spending bars + Expense donut + Savings-rate area + **`GaugeChart`** (Financial Health Score). Other tabs surface the existing per-view cards.
- [ ] **Step 2:** Compute health inputs from real data: extend `getAnalytics` to also return `{ health: { savingsRate, budgetAdherence, loanProgress, hasLoan } }` (savingsRate = last `savingsRate` point; budgetAdherence = from `reconcileBudget` on the current month — share of rows not "over" ×100; loanProgress = `loanStats(...).pct`, hasLoan = totalLoan>0). Pass to `financialHealthScore` in the view.
- [ ] **Step 3:** Verify (`npx vitest run` — health-score tests; build) + commit `feat: redesign analytics (tabs + financial health gauge)`.
- [ ] **Step 4: Live checkpoint.**

---

# BATCH C — Savings + Loan + Settings

## Task C.1: Savings restyle
**Files:** `src/components/savings/savings-view.tsx`
- [ ] **Step 1:** `RingStat` (Savings Goal — `stats.pct`, "of goal achieved", "₹current of ₹target") + **Goal Details** `SectionCard` list (Goal Amount · Current · Monthly Contribution · Target Date · Months to Go — Target Date = `monthLabel(addMonths(currentMonth(), monthsToGoal))` when available) + **`Timeline`** for the 25/50/75/100 milestones (state from `stats.milestones` + `pct`). Keep Add/Edit dialogs (now using `DatePicker`/`Select` where relevant). Replace `MonthNav` usage if any.
- [ ] **Step 2:** Verify + commit `feat: redesign savings (goal ring, details, milestones timeline)`. Live checkpoint.

## Task C.2: Loan restyle
**Files:** `src/components/loan/loan-view.tsx`, `src/components/charts/` (reuse area chart via `Sparkline`/`BarChart` or a small area)
- [ ] **Step 1:** `RingStat` (Loan Overview — `stats.pct`, "of loan repaid", "₹paid of ₹total") + **Loan Details** `SectionCard` (Total · Paid · Remaining · EMI · Start · End[computed]) + **Repayment Progress** area chart (cumulative paid over months from `startDate` + EMI, capped at total) using `Sparkline` (area) or `BarChart`.
- [ ] **Step 2:** Verify + commit `feat: redesign loan (overview ring, details, repayment progress)`. Live checkpoint.

## Task C.3: Settings (full UI; heavy logic → Phase 5)
**Files:** `src/models/Settings.ts` (extend), `src/lib/actions/settings.ts` (new), `src/services/user.ts`/`lib/user.ts` (expose new fields), `src/components/settings/*`, `src/app/(app)/settings/page.tsx`
- [ ] **Step 1:** Extend `Settings` model with `language` (default "English"), `dateFormat` (default "DD MMM YYYY"), `firstDayOfWeek` (default "Monday"), `defaultView` (default "Home"). Surface them via `getCurrentUser` settings (extend `CurrentUser.settings` + mapping).
- [ ] **Step 2:** `lib/actions/settings.ts` — `"use server"` `updatePreferences(input)` validated with a Zod schema; `Settings.updateOne({ userId }, { $set })`; `revalidatePath("/settings")`. Easy prefs only.
- [ ] **Step 3:** Build the two-pane Settings UI: left sub-nav (`General` · `Appearance` · `Notifications` · `Currency` · `Data & Privacy` · `Security` · `About FuFi`) with local `useState` active section; right panels:
  - General: `Select`s (Language, Date Format, First Day of Week, Default View) → `updatePreferences`.
  - Appearance: theme via the existing `ThemeToggle`/next-themes.
  - Currency: currency + locale `Select`s → `updatePreferences`.
  - Notifications: toggle rows (UI only; a note "Delivery coming in Phase 5").
  - Data & Privacy / Security / About: Export / Import / **Delete account** buttons (disabled or no-op with a "Phase 5" note) + info text.
- [ ] **Step 4:** Verify (`npx tsc --noEmit`, `npx eslint .`, `npx next build`) + commit `feat: build settings page (full UI; prefs persisted, heavy logic deferred)`. Live checkpoint.

---

## Task D: Final verification + cleanup
- [ ] **Step 1:** Remove now-unused `src/components/dashboard/month-switcher.tsx` and `src/components/ui/month-nav.tsx` (after confirming no imports remain via `git grep MonthNav` / `MonthSwitcher`). Commit `chore: remove superseded month controls`.
- [ ] **Step 2:** `npx vitest run` (all pass incl. calendar + health-score), `npx eslint .` (clean), `npx tsc --noEmit` (clean), `npx next build` (all routes compile).
- [ ] **Step 3: Full live walkthrough** — every page in light **and** dark, mobile (bottom bar unchanged) + desktop, premium Select/DatePicker/MonthPicker working, charts/gauge/rings animating. Polish remaining spacing/colors live.

---

## Self-Review
- **Spec coverage:** §2.1 tokens → 0.1; §2.2 SectionCard → 0.5; §2.3 StatCard/MiniSparkline/RingStat/GaugeChart/DataTable/Timeline → 0.5; §2.4 Select/DatePicker/MonthPicker/SearchInput → 0.2–0.5; §2.5 shell → 0.7; §3.1–3.7 pages → A.1–C.3; §3.4 health score → 0.6 + B.2; §4 dark theme → 0.1 + per-page live checkpoints; §5 structure → matches; §6 DoD → Task D + per-task verifies; §7 out-of-scope respected (Settings heavy logic deferred).
- **Placeholder scan:** Foundation primitives + health-score + calendar have complete code. Page tasks intentionally specify structure/data/primitives (not pinned Tailwind) per the approved "polish live" approach — this is the unit of work, not a placeholder. No "TBD/handle later".
- **Type consistency:** `Select`(value/onValueChange/options), `DatePicker`/`MonthPicker`(value or month + handler), `StatCard`(label/value/pct/icon/chart), `RingStat`(pct/color/caption/sub), `GaugeChart`(score), `DataTable<T>`(columns/rows/rowKey), `Timeline`(steps), `financialHealthScore`({savingsRate,budgetAdherence,loanProgress,hasLoan})→{score,band}, `monthGrid(year,month)→DayCell[]` are used consistently across tasks. `MonthPicker` replaces `MonthSwitcher`+`MonthNav` (removed in Task D).
