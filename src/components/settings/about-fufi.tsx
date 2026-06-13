"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Receipt,
  Wallet,
  BarChart3,
  PiggyBank,
  Landmark,
  Coins,
  Heart,
  ShieldCheck,
  LockKeyhole,
  Smartphone,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: Receipt, label: "Transactions", desc: "Track every rupee in and out." },
  { icon: Wallet, label: "Budgets", desc: "Plan spend by category." },
  { icon: BarChart3, label: "Analytics", desc: "See where money flows." },
  { icon: PiggyBank, label: "Savings", desc: "Reach goals faster." },
  { icon: Landmark, label: "Loans", desc: "Stay ahead of every EMI." },
  { icon: Coins, label: "Balance", desc: "Carry-over running cash." },
];

const TRUST = [
  { icon: LockKeyhole, label: "Private by design" },
  { icon: Smartphone, label: "Your data, your account" },
  { icon: ShieldCheck, label: "No ads, ever" },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/** Animated growth chart — bars rise, a trend line draws itself, the tip pops. */
function GrowthMark({ className, reduce }: { className?: string; reduce: boolean | null }) {
  const bars = [
    { x: 12, h: 26 },
    { x: 35, h: 42 },
    { x: 58, h: 60 },
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      {bars.map((b, i) => (
        <motion.rect
          key={b.x}
          x={b.x}
          width={17}
          rx={4}
          y={86 - b.h}
          height={b.h}
          fill="currentColor"
          opacity={0.3}
          style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: "easeOut" }}
        />
      ))}
      <motion.path
        d="M8 62 L31 48 L54 32 L86 12"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: "easeInOut" }}
      />
      <motion.circle
        cx={86}
        cy={12}
        r={6}
        fill="currentColor"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        transition={{ duration: 0.5, delay: 1.05, ease: "easeOut" }}
      />
    </svg>
  );
}

export function AboutFuFi({ name }: { name: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={container}
      initial={reduce ? "show" : "hidden"}
      animate="show"
      className="space-y-5"
    >
      {/* Hero */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-2xl bg-hero p-6 text-white shadow-lg shadow-primary/25"
      >
        <GrowthMark
          reduce={reduce}
          className="pointer-events-none absolute -right-3 -top-3 h-40 w-40 text-white/10"
        />
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <GrowthMark reduce={reduce} className="h-8 w-8 text-white" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-3xl font-extrabold leading-none">FuFi</p>
            <p className="mt-1.5 text-sm text-white/85">Fund Your Future</p>
          </div>
          <span className="ml-auto self-start rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium ring-1 ring-white/20">
            v1.0.0
          </span>
        </div>
        <p className="relative mt-4 max-w-md text-sm leading-relaxed text-white/85">
          A premium personal finance manager that brings your salary, spending, savings, loans and
          running balance into one calm, beautiful place.
        </p>
      </motion.div>

      {/* FuFi's AI highlight */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card-elevated/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">FuFi&rsquo;s AI</p>
            <p className="text-xs text-muted-foreground">Your built-in money assistant.</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ask about your money in plain language — &ldquo;How much did I spend last month?&rdquo;, &ldquo;Can I
          afford a ₹40k trip?&rdquo;, &ldquo;Where can I cut back?&rdquo; Answers are grounded in your own data. It&rsquo;s
          read-only (it never changes anything), and your conversations stay private to your account.
        </p>
      </motion.div>

      {/* Feature grid */}
      <motion.div variants={item}>
        <p className="mb-3 text-sm font-semibold">What&rsquo;s inside</p>
        <motion.div variants={container} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <motion.div
              key={label}
              variants={item}
              whileHover={reduce ? undefined : { y: -3 }}
              className="rounded-xl border border-border bg-card-elevated/50 p-3 transition-colors hover:border-primary/40"
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Trust chips */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {TRUST.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-elevated/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </span>
        ))}
      </motion.div>

      {/* Footer line */}
      <motion.p
        variants={item}
        className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground"
      >
        Crafted with
        <Heart className="h-3.5 w-3.5 fill-negative text-negative" />
        for {name} · Version 1.0.0
      </motion.p>
    </motion.div>
  );
}
