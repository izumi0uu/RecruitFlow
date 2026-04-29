"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

type FilterSelectOption = {
  label: string;
  value: string;
};

type FilterSelectProps = {
  className?: string;
  defaultValue?: string | null;
  name: string;
  options: FilterSelectOption[];
  placeholder: string;
};

const FilterSelect = ({
  className,
  defaultValue,
  name,
  options,
  placeholder,
}: FilterSelectProps) => {
  const [value, setValue] = React.useState(defaultValue ?? "");

  React.useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "input cursor-pointer items-center justify-between gap-3 pr-3 text-left",
              className,
            )}
          >
            <span className={cn(!selectedOption && "text-muted-foreground")}>
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
          </button>
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
                className={cn(
                  "cursor-pointer gap-2.5 px-3 py-2.5 text-sm",
                  isSelected &&
                    "bg-workspace-muted-surface text-foreground ring-1 ring-border/70 focus:bg-workspace-muted-surface focus:text-foreground",
                )}
                onSelect={() => {
                  setValue(option.value);
                }}
              >
                <Check
                  className={cn(
                    "size-4 text-muted-foreground opacity-0",
                    isSelected && "opacity-100",
                  )}
                />
                <span>{option.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export { FilterSelect };
