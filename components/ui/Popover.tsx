"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Popover = (
  props: React.ComponentProps<typeof PopoverPrimitive.Root>,
) => {
  return <PopoverPrimitive.Root data-slot="Popover" {...props} />;
};

const PopoverTrigger = (
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>,
) => {
  return <PopoverPrimitive.Trigger data-slot="PopoverTrigger" {...props} />;
};

const PopoverPortal = (
  props: React.ComponentProps<typeof PopoverPrimitive.Portal>,
) => {
  return <PopoverPrimitive.Portal data-slot="PopoverPortal" {...props} />;
};

const PopoverContent = ({
  align = "start",
  className,
  sideOffset = 10,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        data-slot="PopoverContent"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-[min(20rem,calc(100vw-2rem))] rounded-[1.45rem] border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-[0_30px_80px_-50px_var(--shadow-color)] outline-none backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
};

const PopoverAnchor = (
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>,
) => {
  return <PopoverPrimitive.Anchor data-slot="PopoverAnchor" {...props} />;
};

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
};
