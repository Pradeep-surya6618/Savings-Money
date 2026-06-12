"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Binds an "active tab" to a URL search param so the selection is deep-linkable
 * and survives a refresh (e.g. `/transactions?type=expense`, `/settings?section=about`).
 *
 * - The `fallback` value is kept OUT of the URL, so the default view has a clean URL.
 * - Unknown / missing param values resolve to `fallback`.
 * - Uses `router.replace` (not push) so flipping tabs doesn't pile up browser history.
 * - Other existing search params are preserved.
 */
export function useTabParam<T extends string>(
  key: string,
  values: readonly T[],
  fallback: T,
): readonly [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(key);
  const active = (values as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;

  function setActive(value: T) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return [active, setActive] as const;
}
