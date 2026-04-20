"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Avatar = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) => {
  return (
    <AvatarPrimitive.Root
      data-slot="Avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full border border-border/70 bg-surface-1/80 shadow-[0_20px_48px_-34px_var(--shadow-color)]",
        className
      )}
      {...props}
    />
  );
};

const AvatarImage = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) => {
  return (
    <AvatarPrimitive.Image
      data-slot="AvatarImage"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
};

const AvatarFallback = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => {
  return (
    <AvatarPrimitive.Fallback
      data-slot="AvatarFallback"
      className={cn(
        "bg-secondary text-secondary-foreground flex size-full items-center justify-center rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
        className
      )}
      {...props}
    />
  );
};

export { Avatar, AvatarFallback, AvatarImage };
