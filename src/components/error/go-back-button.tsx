"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function GoBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-card-elevated"
    >
      <ArrowLeft className="h-4 w-4" /> Go Back
    </button>
  );
}
