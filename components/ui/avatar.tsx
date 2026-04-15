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
        "relative flex size-8 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/50 shadow-xs",
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
        "bg-secondary text-secondary-foreground flex size-full items-center justify-center rounded-full text-xs font-medium uppercase",
        className
      )}
      {...props}
    />
  );
};

export { Avatar, AvatarFallback, AvatarImage };
