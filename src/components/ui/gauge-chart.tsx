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
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r; // half circle arc length
  const offset = circ * (1 - s / 100);
  // semicircle path from left to right (180°)
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke={band.color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="-mt-10 text-center">
        <p className="text-4xl font-bold tabular-nums">{Math.round(s)}</p>
        <p className="text-sm font-medium" style={{ color: band.color }}>
          {band.label}
        </p>
      </div>
    </div>
  );
}
