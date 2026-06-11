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
