"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./Popover";

type PopConfirmVariant = "default" | "destructive";
type PopConfirmTriggerState = {
  open: boolean;
};

type PopConfirmProps = {
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  cancelText?: string;
  children:
    | React.ReactNode
    | ((state: PopConfirmTriggerState) => React.ReactNode);
  className?: string;
  confirmButtonProps?: React.ComponentProps<typeof Button>;
  confirmText?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  title: React.ReactNode;
  variant?: PopConfirmVariant;
};

const variantClassMap: Record<
  PopConfirmVariant,
  {
    confirmVariant: React.ComponentProps<typeof Button>["variant"];
    icon: string;
  }
> = {
  default: {
    confirmVariant: "default",
    icon: "border-border/70 bg-background/70 text-foreground",
  },
  destructive: {
    confirmVariant: "destructive",
    icon: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

const PopConfirm = ({
  align = "start",
  cancelText = "Cancel",
  children,
  className,
  confirmButtonProps,
  confirmText = "Confirm",
  description,
  icon,
  onOpenChange,
  open,
  side = "bottom",
  title,
  variant = "default",
}: PopConfirmProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const tone = variantClassMap[variant];

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <Popover open={currentOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {typeof children === "function"
          ? children({ open: currentOpen })
          : children}
      </PopoverTrigger>
      <PopoverContent align={align} side={side} className={className}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border",
              tone.icon,
            )}
          >
            {icon ?? <AlertTriangle className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setOpen(false);
                }}
              >
                {cancelText}
              </Button>
              <Button
                type="button"
                variant={tone.confirmVariant}
                size="sm"
                {...confirmButtonProps}
                className={cn("rounded-full", confirmButtonProps?.className)}
              >
                {confirmButtonProps?.children ?? confirmText}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { PopConfirm };
