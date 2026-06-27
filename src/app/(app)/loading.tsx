/** Lightweight skeleton shown while a dashboard page streams. Overrides the global
 *  branded splash (app/loading.tsx) for in-app navigation so moving between pages
 *  feels instant instead of flashing the full-screen loader. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-card-elevated" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-card-elevated" />
        <div className="h-28 animate-pulse rounded-2xl bg-card-elevated" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-card-elevated" />
    </div>
  );
}
