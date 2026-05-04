"use client";

import NumberFlow from "@number-flow/react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type FilterTabOption<TValue extends string = string> = {
  count: number;
  countLabel: string;
  description: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  tone: string;
  value: TValue;
};

type FilterTabsProps<TValue extends string = string> = {
  className?: string;
  disabled?: boolean;
  gridClassName?: string;
  layoutId?: string;
  onValueChange: (value: TValue) => void;
  options: ReadonlyArray<FilterTabOption<TValue>>;
  value: TValue;
};

const filterTabsMotionTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
} as const;

const FilterTabs = <TValue extends string = string>({
  className,
  disabled = false,
  gridClassName,
  layoutId,
  onValueChange,
  options,
  value,
}: FilterTabsProps<TValue>) => {
  const generatedId = useId();
  const activeLayoutId = layoutId ?? `${generatedId}-filter-tab`;

  return (
    <div
      className={cn(
        "rounded-[1.45rem] border border-border/70 bg-background/58 p-1.5",
        className,
      )}
    >
      <div className={cn("grid gap-1.5 md:grid-cols-5", gridClassName)}>
        {options.map((option) => {
          const isActive = option.value === value;
          const Icon = option.icon;

          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              aria-pressed={isActive}
              disabled={disabled || option.disabled}
              className={cn(
                "relative h-auto min-h-[5.8rem] w-full items-stretch justify-start rounded-[1.05rem] px-3 py-3 text-left transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-55",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-surface-1/58 hover:text-foreground",
              )}
              onClick={() => {
                onValueChange(option.value);
              }}
            >
              {isActive ? (
                <motion.span
                  layoutId={activeLayoutId}
                  transition={filterTabsMotionTransition}
                  className="absolute inset-0 rounded-[1.05rem] border border-border/70 bg-surface-1 shadow-[0_22px_54px_-42px_var(--shadow-color)]"
                />
              ) : null}
              <span className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-between gap-3">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-[0.85rem] border bg-background/74",
                      option.tone,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/72 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                    <NumberFlow value={option.count} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="mt-1 block truncate text-xs">
                    {option.description}
                  </span>
                </span>
                <span className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {option.countLabel}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export { type FilterTabOption, FilterTabs };
