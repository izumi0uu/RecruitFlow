"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const RadioGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => {
  return (
    <RadioGroupPrimitive.Root
      data-slot="RadioGroup"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
};

const RadioGroupItem = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => {
  return (
    <RadioGroupPrimitive.Item
      data-slot="RadioGroupItem"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 dark:bg-input/30 relative aspect-square size-4 shrink-0 rounded-full border bg-background shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="RadioGroupIndicator"
        className="relative flex size-full items-center justify-center"
      >
        <span className="bg-primary size-2 rounded-full" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
};

export { RadioGroup, RadioGroupItem };
