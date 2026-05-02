"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

type FilterSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type FilterSelectProps = {
  className?: string;
  defaultValue?: string | null;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: ReadonlyArray<FilterSelectOption>;
  placeholder: string;
  value?: string | null;
};

const FilterSelect = ({
  className,
  defaultValue,
  disabled = false,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  value: controlledValue,
}: FilterSelectProps) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? "",
  );
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? (controlledValue ?? "") : uncontrolledValue;

  React.useEffect(() => {
    if (isControlled) return;

    setUncontrolledValue(defaultValue ?? "");
  }, [defaultValue, isControlled]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "group input cursor-pointer items-center justify-between gap-3 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-60",
              className,
            )}
            variant="outline"
          >
            <span
              className={cn(
                "min-w-0 truncate",
                !selectedOption && "text-muted-foreground",
              )}
            >
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <DropdownMenuItem
                key={option.value || "__all__"}
                disabled={option.disabled}
                className={cn(
                  "cursor-pointer gap-2.5 px-3 py-2.5 text-sm",
                  isSelected &&
                    "bg-workspace-muted-surface text-foreground ring-1 ring-border/70 focus:bg-workspace-muted-surface focus:text-foreground",
                )}
                onSelect={() => {
                  if (!isControlled) {
                    setUncontrolledValue(option.value);
                  }

                  onValueChange?.(option.value);
                }}
              >
                <Check
                  className={cn(
                    "size-4 text-muted-foreground opacity-0",
                    isSelected && "opacity-100",
                  )}
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export { FilterSelect };
