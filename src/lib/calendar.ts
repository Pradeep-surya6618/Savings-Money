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
